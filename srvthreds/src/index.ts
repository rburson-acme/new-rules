import './init.js';

import express, { Express, Request, Response } from 'express';
import http from 'http';

import { Agent } from './ts/agent/Agent.js';
import { Config as StaticEngineConfig } from './ts/engine/Config.js';
import { Server } from './ts/engine/Server.js';
import { EventQ } from './ts/queue/EventQ.js';
import { MessageQ } from './ts/queue/MessageQ.js';
import { RemoteQBroker } from './ts/queue/remote/RemoteQBroker.js';
import { RemoteQService } from './ts/queue/remote/RemoteQService.js';
import { Sessions } from './ts/sessions/Sessions.js';
import { SessionStorage } from './ts/sessions/storage/SessionStorage.js';
import { StorageFactory } from './ts/storage/StorageFactory.js';
import { Event, Logger, Message, PatternModel } from './ts/thredlib/index.js';

import rascal_config from './ts/config/rascal_config.json' with { type: 'json' };
import sessionsModel from './ts/config/sessions/simple_test_sessions_model.json' with { type: 'json' };
//import sessionsModel from './ts/config/sessions/downtime.sessions.json' with { type: 'json' };
//import sessionsModel from './ts/config/sessions/routing_sessions.json' with { type: 'json' };
import resolverConfig from './ts/config/resolver_config.json' with { type: 'json' };
//import patternModel from './ts/config/patterns/downtime_light.pattern.json' with { type: 'json' };
import engineConfig from './ts/config/engine.json' with { type: 'json' };
import patternModel from './ts/config/patterns/uav_detection.pattern.json' with { type: 'json' };
//import { patternModel } from './ts/config/patterns/ts/uav_detection_pattern.js';
//import patternModel from './ts/config/patterns/echo_test.pattern.json' with { type: 'json' };
const patternModels: PatternModel[] = [patternModel] as PatternModel[];
StaticEngineConfig.engineConfig = engineConfig;

import path from 'node:path';
import url from 'node:url';
import { PersistenceManager } from './ts/engine/persistence/PersistenceManager.js';
import { System } from './ts/engine/System.js';
import { PubSubFactory } from './ts/pubsub/PubSubFactory.js';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_PORT = 3001;

/*

    This service runs all agents in one process for testing purposes

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

//@TEMP sms
// this should go in the sms agent - left here for reference
app.post('/sms', (req: Request, res: Response) => {
  /*
    const twiml = new twilio.twiml.MessagingResponse();
    twiml.message('The Robots are coming! Head for the hills!');
    res.writeHead(200, { 'Content-Type': 'text/xml' });
    res.end(twiml.toString());
    */
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
  sessionAgent?: Agent;
  persistenceAgent?: Agent;
  engineEventService?: RemoteQService<Event>;
  engineMessageService?: RemoteQService<Message>;

  constructor() {}

  // Start server
  async startServices() {
    // global setup - i.e. all services need to do these
    // set up the message broker to be used by all q services in this process
    const qBroker = new RemoteQBroker(rascal_config);
    // connect to persistence
    await PersistenceManager.get().connect();

    // ----------------------------------- Engine Setup -----------------------------------

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
    await engineServer.start({ patternModels });

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

    // create and run a Session Agent
    // if config is not provided, it will be loaded from persistence (run bootstrap first)
    this.sessionAgent = new Agent({
      agentName: 'session_agent',
      //agentConfig: sessionAgentConfig,
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
    this.persistenceAgent = new Agent({
      agentName: 'persistence_agent',
      // if config is not provided, it will be loaded from persistence (run bootstrap first)
      // agentConfig: persistenceAgentConfig,
      eventQ: persistenceEventQ,
      messageQ: persistenceMessageQ,
      additionalArgs: {
        dbname: 'demo',
      },
    });
    await this.persistenceAgent.start();
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
    Logger.info(`Shutting down persistence agent...`);
    await this.persistenceAgent?.shutdown();
    Logger.info(`Agent shutdown successfully.`);

    Logger.info(`Disconnecting PersistenceManager..`);
    await PersistenceManager.get().disconnect();
    Logger.info(`Disconnecting all Storage connections...`);
    await StorageFactory.disconnectAll();
    Logger.info(`Disconnecting PubSub connections...`);
    await PubSubFactory.disconnectAll();
    Logger.info(`Disconnecting Redis storage...`);
    await StorageFactory.disconnectAll();
    Logger.info(`Redis storage disconnected successfuly.`);
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
