import { Server } from './engine/Server.js';
import { EventQ } from './queue/EventQ.js';
import { MessageQ } from './queue/MessageQ.js';
import { RemoteQBroker } from './queue/remote/RemoteQBroker.js';
import { RemoteQService } from './queue/remote/RemoteQService.js';
import { Sessions } from './sessions/Sessions.js';
import { SessionStorage } from './sessions/storage/SessionStorage.js';
import { StorageFactory } from './storage/StorageFactory.js';
import { Event, Logger, Message, PatternModel, SessionsModel } from './thredlib/index.js';
import { SystemController } from './persistence/controllers/SystemController.js';
import { System } from './engine/System.js';
import { PubSubFactory } from './pubsub/PubSubFactory.js';
import { ConfigLoader } from './config/ConfigLoader.js';
import { ConfigManager } from './config/ConfigManager.js';
import { EngineConfigDef, RascalConfigDef, ResolverConfigDef, SessionsConfigDef } from './config/ConfigDefs.js';
import { ResolverConfig } from './config/ResolverConfig.js';
import { SessionsConfig } from './config/SessionsConfig.js';
import { EngineConfig } from './config/EngineConfig.js';
import { RascalConfig } from './config/RascalConfig.js';

/***
 *     __                 _                     _
 *    / _\ ___ _ ____   _(_) ___ ___   ___  ___| |_ _   _ _ __
 *    \ \ / _ \ '__\ \ / / |/ __/ _ \ / __|/ _ \ __| | | | '_ \
 *    _\ \  __/ |   \ V /| | (_|  __/ \__ \  __/ |_| |_| | |_) |
 *    \__/\___|_|    \_/ |_|\___\___| |___/\___|\__|\__,_| .__/
 *                                                       |_|
 */

export class EngineServiceManager {
  engineEventService?: RemoteQService<Event>;
  engineMessageService?: RemoteQService<Message>;

  constructor() {}

  // Start server
  async startServices({
    configName,
    configPath,
    rascalConfigName,
    rascalConfigPath,
    sessionsModelName,
    sessionsModelPath,
    resolverConfigName,
    resolverConfigPath,
  }: {
    configName?: string;
    configPath?: string;
    rascalConfigName?: string;
    rascalConfigPath?: string;
    sessionsModelName?: string;
    sessionsModelPath?: string;
    resolverConfigName?: string;
    resolverConfigPath?: string;
  }) {
    const engineConfig = await ConfigManager.get().loadConfig<EngineConfigDef, EngineConfig>({
      type: 'engine-config',
      configName,
      configPath,
      config: new EngineConfig(),
    });
    if (!engineConfig)
      throw new Error(`Failed to load engine config from configName: ${configName} or configPath: ${configPath}`);
    // global setup - i.e. all services need to do these
    // set up the message broker to be used by all q services in this process
    const rascalConfig = await ConfigManager.get().loadConfig<RascalConfigDef, RascalConfig>({
      type: 'rascal-config',
      config: new RascalConfig(),
      configName: rascalConfigName,
      configPath: rascalConfigPath,
    });
    if (!rascalConfig)
      throw new Error(
        `Failed to load Rascal config from configName: ${rascalConfigName} or configPath: ${rascalConfigPath}`,
      );
    const qBroker = new RemoteQBroker(rascalConfig);
    // connect to persistence
    await SystemController.get().connect();

    // ----------------------------------- Engine Setup -----------------------------------

    const sessionsConfig = await ConfigManager.get().loadConfig<SessionsConfigDef, SessionsConfig>({
      type: 'sessions-model',
      config: new SessionsConfig(),
      configName: sessionsModelName,
      configPath: sessionsModelPath,
    });
    if (!sessionsConfig)
      throw new Error(
        `Failed to load sessions model from configName: ${sessionsModelName} or configPath: ${sessionsModelPath}`,
      );
    const resolverConfig = await ConfigManager.get().loadConfig<ResolverConfigDef, ResolverConfig>({
      type: 'resolver-config',
      config: new ResolverConfig(),
      configName: resolverConfigName,
      configPath: resolverConfigPath,
    });
    if (!resolverConfig)
      throw new Error(
        `Failed to load resolver config from configName: ${resolverConfigName} or configPath: ${resolverConfigPath}`,
      );
    const sessions = new Sessions(resolverConfig, sessionsConfig, new SessionStorage(StorageFactory.getStorage()));
    System.initialize(sessions, { shutdown: this.shutdown.bind(this) });

    // set up the remote Qs for the engine
    this.engineEventService = await RemoteQService.newInstance<Event>({ qBroker, subNames: ['sub_event'] });
    const engineEventQ: EventQ = new EventQ(this.engineEventService);
    this.engineMessageService = await RemoteQService.newInstance<Message>({ qBroker, pubName: 'pub_message' });
    const engineMessageQ: MessageQ = new MessageQ(this.engineMessageService);
    //  setup the engine server
    const engineServer = new Server(engineEventQ, engineMessageQ);
    await engineServer.start();
  }

  /***
   *     __                 _              ___ _
   *    / _\ ___ _ ____   _(_) ___ ___    / __\ | ___  __ _ _ __  _   _ _ __
   *    \ \ / _ \ '__\ \ / / |/ __/ _ \  / /  | |/ _ \/ _` | '_ \| | | | '_ \
   *    _\ \  __/ |   \ V /| | (_|  __/ / /___| |  __/ (_| | | | | |_| | |_) |
   *    \__/\___|_|    \_/ |_|\___\___| \____/|_|\___|\__,_|_| |_|\__,_| .__/
   *                                                                   |_|
   */

  //
  // quit on ctrl-c when running docker in terminal
  // shut down server
  async shutdown(exitCode = 0): Promise<void> {
    return this.disconnectAll()
      .then(() => {
        Logger.info('Shutdown completed.', new Date().toISOString());
        process.exit(exitCode);
      })
      .catch((err) => {
        Logger.error(`Shutdown error:`, err);
        process.exit(1);
      });
  }

  async disconnectAll() {
    // await eventService.deleteAll().catch(Logger.error);
    // these disconnect the underlying broker,
    // so we don't have to also disconnect this.messageService

    /*
            Order is important here.
            1) Finish serving Q messages (if any)
               The rascal config value 'deferCloseChannel' determines how long
               to keep the channel open to finish processing messages (that have already been taken)
            3) Shutdown the storage and persistence connections
        */
    Logger.info(`Disconnecting RemoteQ broker...`);
    // @TODO
    // Note: if there are unack'd messages unsubscribeAll and shutdown will block indefinitely
    // need to set them up for redelivery
    // these use the same broker so only need to disconnect one queue
    await this.engineEventService?.disconnect().catch(Logger.error);
    Logger.info(`RemoteQ Broker disconnected successfully.`);

    Logger.info(`Disconnecting PersistenceManager..`);
    await SystemController.get().disconnect();
    Logger.info(`Disconnecting all Storage connections...`);
    await StorageFactory.disconnectAll();
    Logger.info(`Disconnecting PubSub connections...`);
    await PubSubFactory.disconnectAll();
    Logger.info(`Disconnecting Redis storage...`);
  }
}
