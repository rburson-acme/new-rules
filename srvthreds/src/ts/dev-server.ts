import 'dotenv/config';
import express, { Express, Request, Response } from 'express';
import http from 'http';

import { AgentService } from './agent/AgentService.js';
import { Server } from './engine/Server.js';
import { EventQ } from './queue/EventQ.js';
import { MessageQ } from './queue/MessageQ.js';
import { RemoteQBroker } from './queue/remote/RemoteQBroker.js';
import { RemoteQService } from './queue/remote/RemoteQService.js';
import { Sessions } from './sessions/Sessions.js';
import { SessionStorage } from './sessions/storage/SessionStorage.js';
import { StorageFactory } from './storage/StorageFactory.js';
import { Event, Logger, Message, PatternModel, Timers } from './thredlib/index.js';
import path from 'node:path';
import url from 'node:url';
import { SystemController } from './persistence/controllers/SystemController.js';
import { System } from './engine/System.js';
import { PubSubFactory } from './pubsub/PubSubFactory.js';
import { RemoteAgentService } from './agent/RemoteAgentService.js';
import { AgentConfig } from './config/AgentConfig.js';
import { ConfigManager } from './config/ConfigManager.js';
import { ResolverConfig } from './config/ResolverConfig.js';
import { SessionsConfig } from './config/SessionsConfig.js';
import {
  AgentConfigDef,
  EngineConfigDef,
  RascalConfigDef,
  ResolverConfigDef,
  SessionsConfigDef,
} from './config/ConfigDefs.js';
import { EngineConfig } from './config/EngineConfig.js';
import { RascalConfig } from './config/RascalConfig.js';
import { PinoLogger } from './logger/PinoLogger.js';

import sync_test_pattern from '../../run-profiles/test/patterns/client_async_test.pattern.json' with { type: 'json' };

const patternModelsOverride: PatternModel[] = [sync_test_pattern] as PatternModel[];

Logger.loggerDelegate = new PinoLogger();

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_PORT = 3001;

/*

    This service runs all agents and services in one process for testing purposes

*/

/***
 *     __    __     _       __                            __      _
 *    / / /\ \ \___| |__   / _\ ___ _ ____   _____ _ __  / _\ ___| |_ _   _ _ __
 *    \ \/  \/ / _ \ '_ \  \ \ / _ \ '__\ \ / / _ \ '__| \ \ / _ \ __| | | | '_ \
 *     \  /\  /  __/ |_) | _\ \  __/ |   \ V /  __/ |    _\ \  __/ |_| |_| | |_) |
 *      \/  \/ \___|_.__/  \__/\___|_|    \_/ \___|_|    \__/\___|\__|\__,_| .__/
 *                                                                         |_|
 */

const app: Express = express();
const httpServer: http.Server = http.createServer(app);
/*const httpServer = https.createServer({
    key: fs.readFileSync(__dirname + '/config/privkey.pem'),
    cert: fs.readFileSync(__dirname + '/config/fullchain.pem'),
    ca: fs.readFileSync(__dirname + '/config/fullchain.pem')
  }, app);*/

/************** Web Server ************************/
app.use(express.static(__dirname + '/web'));
app.get('/', function (req: Request, res: Response) {
  res.sendFile(__dirname + '/web/index.html');
});

// test event interface
app.get('/event', function (req: Request, res: Response) {
  res.sendFile(__dirname + '/web/event.html');
});

// assembly demo
app.get('/assembly', function (req: Request, res: Response) {
  res.sendFile(__dirname + '/web/assembly.html');
});
app.get('/rms', function (req: Request, res: Response) {
  res.sendFile(__dirname + '/web/rms.html');
});

/************End Web Server ************************/

/***
 *     __                 _                     _
 *    / _\ ___ _ ____   _(_) ___ ___   ___  ___| |_ _   _ _ __
 *    \ \ / _ \ '__\ \ / / |/ __/ _ \ / __|/ _ \ __| | | | '_ \
 *    _\ \  __/ |   \ V /| | (_|  __/ \__ \  __/ |_| |_| | |_) |
 *    \__/\___|_|    \_/ |_|\___\___| |___/\___|\__|\__,_| .__/
 *                                                       |_|
 */

class ServiceManager {
  sessionAgent?: AgentService;
  persistenceAgent?: AgentService;
  robotAgent?: RemoteAgentService;
  engineEventService?: RemoteQService<Event>;
  engineMessageService?: RemoteQService<Message>;

  constructor() {}

  // Start server
  async startServices() {
    const engineConfig = await ConfigManager.get().loadConfig<EngineConfigDef, EngineConfig>({
      type: 'engine-config',
      configName: 'engine',
      config: new EngineConfig(),
    });
    if (!engineConfig) throw new Error(`Failed to load engine config from configName: 'engine'`);
    // global setup - i.e. all services need to do these
    // set up the message broker to be used by all q services in this process

    const rascalConfig = await ConfigManager.get().loadConfig<RascalConfigDef, RascalConfig>({
      type: 'rascal-config',
      config: new RascalConfig(),
      configName: 'rascal_config',
    });
    if (!rascalConfig) throw new Error(`Failed to load Rascal config from configName: 'rascal_config'`);
    const qBroker = new RemoteQBroker();

    // connect to persistence
    await SystemController.get().connect();

    // ----------------------------------- Engine Setup -----------------------------------

    const sessionsConfig = await ConfigManager.get().loadConfig<SessionsConfigDef, SessionsConfig>({
      type: 'sessions-model',
      config: new SessionsConfig(),
      configName: 'sessions_model',
    });
    if (!sessionsConfig) throw new Error(`Failed to load sessions model from configName: 'sessions_model'`);
    const resolverConfig = await ConfigManager.get().loadConfig<ResolverConfigDef, ResolverConfig>({
      type: 'resolver-config',
      config: new ResolverConfig(),
      configName: 'resolver_config',
    });
    if (!resolverConfig) throw new Error(`Failed to load resolver config from configName: 'resolver_config'`);
    const sessions = new Sessions(new SessionStorage(StorageFactory.getStorage()));

    // initialize the system with the new sessions model and a shutdown handler
    System.initialize(sessions, { shutdown: this.shutdown.bind(this) });

    // set up the remote Qs for the engine
    this.engineEventService = await RemoteQService.newInstance<Event>({ qBroker: qBroker, subNames: ['sub_event'] });
    const engineEventQ: EventQ = new EventQ(this.engineEventService);
    this.engineMessageService = await RemoteQService.newInstance<Message>({ qBroker: qBroker, pubName: 'pub_message' });
    const engineMessageQ: MessageQ = new MessageQ(this.engineMessageService);

    // @TODO separate service
    //  setup the engine server
    const engineServer = new Server(engineEventQ, engineMessageQ);

    // uncomment for manual testing
    await engineServer.start({ patternModels: patternModelsOverride });

    // comment this out for manual testing
    //await engineServer.start();

    // ----------------------------------- Session Service Setup -----------------------------------
    // Note: this is running in process for convenience but will be an independent service
    // set up the remote Qs for the session service agent
    const sessionEventService = await RemoteQService.newInstance<Event>({ qBroker: qBroker, pubName: 'pub_event' });
    const sessionEventQ: EventQ = new EventQ(sessionEventService);
    const sessionMessageService = await RemoteQService.newInstance<Message>({
      qBroker: qBroker,
      subNames: ['sub_session1_message', 'sub_session_message'],
    });
    const sessionMessageQ: MessageQ = new MessageQ(sessionMessageService);

    const sessionAgentConfig = await ConfigManager.get().loadConfig<AgentConfigDef, AgentConfig>({
      type: 'agent-config',
      config: new AgentConfig('org.wt.session1'),
      configName: 'session_agent',
    });
    if (!sessionAgentConfig) throw new Error(`Agent: failed to load config for 'session_agent'`);

    // create and run a Session Agent
    // if config is not provided, it will be loaded from persistence (run bootstrap first)
    this.sessionAgent = new AgentService({
      agentConfig: sessionAgentConfig,
      eventQ: sessionEventQ,
      messageQ: sessionMessageQ,
      additionalArgs: {
        sessionsModelName: 'sessions_model',
      },
    });
    await this.sessionAgent.start();

    // ----------------------------------- Persistence Agent Setup -----------------------------------
    // Note: this is running in process for convenience but will be an independent service
    // set up the remote Qs for the persistence agent
    const persistenceEventService = await RemoteQService.newInstance<Event>({ qBroker: qBroker, pubName: 'pub_event' });
    const persistenceEventQ: EventQ = new EventQ(persistenceEventService);
    const persistenceMessageService = await RemoteQService.newInstance<Message>({
      qBroker: qBroker,
      subNames: ['sub_persistence_message'],
    });

    const persistenceMessageQ: MessageQ = new MessageQ(persistenceMessageService);
    const persistenceAgentConfig = await ConfigManager.get().loadConfig<AgentConfigDef, AgentConfig>({
      type: 'agent-config',
      configName: 'persistence_agent',
      config: new AgentConfig('org.wt.persistence'),
    });
    this.persistenceAgent = new AgentService({
      agentConfig: persistenceAgentConfig,
      eventQ: persistenceEventQ,
      messageQ: persistenceMessageQ,
      //additionalArgs: { dbname: 'demo', },
    });
    await this.persistenceAgent.start();

    // ----------------------------------- Robot Agent Setup -----------------------------------
    // Note: this is running in process for convenience but will be a remote service
    const robotConfig = await ConfigManager.get().loadConfig<AgentConfigDef, AgentConfig>({
      type: 'agent-config',
      configName: 'robot_agent',
      config: new AgentConfig('org.wt.robot'),
    });
    if (!robotConfig) throw new Error(`Agent: failed to load config for 'robot_agent'`);
    this.robotAgent = new RemoteAgentService({
      agentConfig: robotConfig,
    });
    await this.robotAgent.start();
  }

  /***
   *     __                              ___ _
   *    / _\ ___ _ ____   _____ _ __    / __\ | ___  __ _ _ __  _   _ _ __
   *    \ \ / _ \ '__\ \ / / _ \ '__|  / /  | |/ _ \/ _` | '_ \| | | | '_ \
   *    _\ \  __/ |   \ V /  __/ |    / /___| |  __/ (_| | | | | |_| | |_) |
   *    \__/\___|_|    \_/ \___|_|    \____/|_|\___|\__,_|_| |_|\__,_| .__/
   *                                                                 |_|
   *
   */

  //
  // quit on ctrl-c when running docker in terminal
  // shut down server
  async shutdown({ exitCode = 0, delay }: { exitCode?: number; delay?: number }): Promise<void> {
    const engineConfig = ConfigManager.get().getConfig<EngineConfig>('engine-config');
    delay = delay ?? engineConfig?.shutdownDelay ?? 0;
    Logger.info(`Waiting ${delay}ms before shutting down...`);
    await Timers.wait(delay);
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
    const engineConfig = ConfigManager.get().getConfig<EngineConfig>('engine-config');
    // these disconnect the underlying broker,
    // so we don't have to also disconnect this.messageService
    /*
        Order is important here.
        1) Stop consuming events from the Q
        2) Finish processing consumed events and publishing messages
        3) Stop publishing messages
        4) Shutdown the storage and persistence connections
    */
    Logger.info(`Disconnecting RemoteQ broker...`);
    // @TODO
    // Note: if there are unack'd messages unsubscribeAll and shutdown will block indefinitely
    // need to set them up for redelivery
    // stop consuming events
    Logger.info(`Stopping event consumption...`);
    await this.engineEventService?.unsubscribeAll().catch(Logger.error);
    Logger.info(`RemoteQ Broker disconnected successfully.`);
    // wait for processing to complete
    Logger.info(`Waiting ${engineConfig?.eventProcessingWait ?? 1000}ms for event processing to complete...`);
    await Timers.wait(engineConfig?.eventProcessingWait ?? 1000);
    // stop publishing messages
    Logger.info(`Disconnecting RemoteQ...`);
    await this.engineMessageService?.disconnect().catch(Logger.error);
    Logger.info(`Shutting down session agent...`);
    await this.sessionAgent?.shutdown();
    Logger.info(`Agent shutdown successfully.`);
    Logger.info(`Shutting down robot agent...`);
    await this.robotAgent?.shutdown();
    Logger.info(`Agent shutdown successfully.`);
    Logger.info(`Shutting down persistence agent...`);
    await this.persistenceAgent?.shutdown();
    Logger.info(`Agent shutdown successfully.`);

    Logger.info(`Disconnecting PersistenceManager..`);
    await SystemController.get().disconnect();
    Logger.info(`Disconnecting all Storage connections...`);
    await StorageFactory.disconnectAll();
    Logger.info(`Disconnecting PubSub connections...`);
    await PubSubFactory.disconnectAll();
    Logger.info(`Disconnecting Redis storage...`);
  }
}

const serviceManager = new ServiceManager();
await serviceManager.startServices();

let shuttingDown = false;
process.on('SIGINT', async function onSigint() {
  if (shuttingDown) {
    Logger.info('Got SIGINT (aka ctrl-c ) again. Shutdown pending...', new Date().toISOString());
  } else {
    shuttingDown = true;
    Logger.info('Got SIGINT (aka ctrl-c ). Waiting for shutdown...', new Date().toISOString());
    await serviceManager.shutdown({});
  }
});

// quit properly on docker stop
process.on('SIGTERM', async function onSigterm() {
  if (shuttingDown) {
    Logger.info('Got SIGTERM (aka ctrl-c ) again. Shutdown pending...', new Date().toISOString());
  } else {
    shuttingDown = true;
    Logger.info('Got SIGTERM (docker container stop). Graceful shutdown ', new Date().toISOString());
    await serviceManager.shutdown({});
  }
});

/*
httpServer.listen(443, function () {
    Logger.info('listening on *:443');
});
*/

httpServer.listen(DEFAULT_PORT, function () {
  Logger.info(`Engine Web Service running on *:${DEFAULT_PORT}`);
});
