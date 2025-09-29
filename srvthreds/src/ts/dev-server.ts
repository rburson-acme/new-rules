import './init.js';

import express, { Express, Request, Response } from 'express';
import http from 'http';

import { AgentService } from './agent/AgentService.js';
import { Config, Config as StaticEngineConfig } from './engine/Config.js';
import { Server } from './engine/Server.js';
import { EventQ } from './queue/EventQ.js';
import { MessageQ } from './queue/MessageQ.js';
import { RemoteQBroker } from './queue/remote/RemoteQBroker.js';
import { RemoteQService } from './queue/remote/RemoteQService.js';
import { Sessions } from './sessions/Sessions.js';
import { SessionStorage } from './sessions/storage/SessionStorage.js';
import { StorageFactory } from './storage/StorageFactory.js';
import { Event, Logger, Message, PatternModel } from './thredlib/index.js';

const patternModelsOverride: PatternModel[] = [] as PatternModel[];

import path from 'node:path';
import url from 'node:url';
import { SystemController } from './persistence/controllers/SystemController.js';
import { System } from './engine/System.js';
import { PubSubFactory } from './pubsub/PubSubFactory.js';
import { RemoteAgentService } from './agent/RemoteAgentService.js';
import { ConfigLoader } from './config/ConfigLoader.js';
import { AgentConfig } from './agent/Config.js';

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
    const engineConfig = await SystemController.get().getConfig('engine');
    StaticEngineConfig.engineConfig = engineConfig;
    // global setup - i.e. all services need to do these
    // set up the message broker to be used by all q services in this process
    const rascal_config = await SystemController.get().getConfig('rascal_config');
    const qBroker = new RemoteQBroker(rascal_config);
    // connect to persistence
    await SystemController.get().connect();

    // ----------------------------------- Engine Setup -----------------------------------

    const sessionsModel = await SystemController.get().getConfig('sessions_model');
    const resolverConfig = await SystemController.get().getConfig('resolver_config');
    const sessions = new Sessions(sessionsModel, resolverConfig, new SessionStorage(StorageFactory.getStorage()));
    System.initialize(sessions, { shutdown: this.shutdown.bind(this) });

    // set up the remote Qs for the engine
    this.engineEventService = await RemoteQService.newInstance<Event>({ qBroker, subName: 'sub_event' });
    const engineEventQ: EventQ = new EventQ(this.engineEventService);
    this.engineMessageService = await RemoteQService.newInstance<Message>({ qBroker, pubName: 'pub_message' });
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
    const sessionEventService = await RemoteQService.newInstance<Event>({ qBroker, pubName: 'pub_event' });
    const sessionEventQ: EventQ = new EventQ(sessionEventService);
    const sessionMessageService = await RemoteQService.newInstance<Message>({
      qBroker,
      subName: 'sub_session1_message',
    });
    const sessionMessageQ: MessageQ = new MessageQ(sessionMessageService);

    const sessionAgentConfig: AgentConfig = await SystemController.get().getFromNameOrPath('session_agent');
    // create and run a Session Agent
    // if config is not provided, it will be loaded from persistence (run bootstrap first)
    this.sessionAgent = new AgentService({
      agentConfig: sessionAgentConfig,
      eventQ: sessionEventQ,
      messageQ: sessionMessageQ,
      additionalArgs: {
        sessionsModel,
      },
    });
    await this.sessionAgent.start();

    // ----------------------------------- Persistence Agent Setup -----------------------------------
    // Note: this is running in process for convenience but will be an independent service
    // set up the remote Qs for the persistence agent
    const persistenceEventService = await RemoteQService.newInstance<Event>({ qBroker, pubName: 'pub_event' });
    const persistenceEventQ: EventQ = new EventQ(persistenceEventService);
    const persistenceMessageService = await RemoteQService.newInstance<Message>({
      qBroker,
      subName: 'sub_persistence_message',
    });

    const persistenceMessageQ: MessageQ = new MessageQ(persistenceMessageService);
    const persistenceAgentConfig: AgentConfig = await SystemController.get().getFromNameOrPath('persistence_agent');
    this.persistenceAgent = new AgentService({
      agentConfig: persistenceAgentConfig,
      eventQ: persistenceEventQ,
      messageQ: persistenceMessageQ,
      //additionalArgs: { dbname: 'demo', },
    });
    await this.persistenceAgent.start();

    // ----------------------------------- Robot Agent Setup -----------------------------------
    // Note: this is running in process for convenience but will be a remote service
    const robotConfig = await SystemController.get().getConfig('robot_agent');
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
  async shutdown() {
    return this.disconnectAll()
      .then(() => {
        Logger.info('Shutdown completed successfully.', new Date().toISOString());
        process.exit(0);
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
            2) Shutdown the Agent so that disconnects can prompt session removals
            3) Shutdown the storage and persistence connections
        */
    Logger.info(`Disconnecting RemoteQ broker...`);
    // @TODO
    // Note: if there are unack'd messages unsubscribeAll and shutdown will block indefinitely
    // need to set them up for redelivery
    // these use the same broker so only need to disconnect one queue
    await this.engineEventService?.disconnect().catch(Logger.error);
    Logger.info(`RemoteQ Broker disconnected successfully.`);

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
    await serviceManager.shutdown();
  }
});

// quit properly on docker stop
process.on('SIGTERM', async function onSigterm() {
  if (shuttingDown) {
    Logger.info('Got SIGTERM (aka ctrl-c ) again. Shutdown pending...', new Date().toISOString());
  } else {
    shuttingDown = true;
    Logger.info('Got SIGTERM (docker container stop). Graceful shutdown ', new Date().toISOString());
    await serviceManager.shutdown();
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
