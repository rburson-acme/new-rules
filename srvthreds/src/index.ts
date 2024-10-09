import './init.js';

import fs from 'fs';
import express from 'express';
import http from 'http';
import { Request, Response, Express } from 'express';
//@temp sms

import { Logger, PatternModel, Event, Message } from './ts/thredlib/index.js';
import { Sessions } from './ts/sessions/Sessions.js';
import { SessionStorage } from './ts/sessions/storage/SessionStorage.js';
import { EventQ } from './ts/queue/EventQ.js';
import { MessageQ } from './ts/queue/MessageQ.js';
import { Server } from './ts/engine/Server.js';
import { StorageFactory } from './ts/storage/StorageFactory.js';
import { RemoteQBroker } from './ts/queue/remote/RemoteQBroker.js';
import { RemoteQService } from './ts/queue/remote/RemoteQService.js';
import { Agent } from './ts/agent/Agent.js';
import { Config as StaticEngineConfig } from './ts/engine/Config.js';
import { Config as StaticAgentConfig } from './ts/agent/Config.js';
    
import rascal_config from './ts/config/rascal_config.json' with { type: 'json' };
import sessionsModel from './ts/config/sessions/downtime.sessions.json' with { type: 'json' };
//import sessionsModel from './config/sessions/routing_sessions.json' with { type: 'json' };
//import sessionsModel from './config/sessions/simple_test_sessions_model.json' with { type: 'json' };
import resolverConfig from './ts/config/resolver_config.json' with { type: 'json' };
import patternModel from './ts/config/patterns/downtime_light.pattern.json' with { type: 'json' };
//import patternModel from './config/patterns/routing_optimization.pattern.json' with { type: 'json' };
//import patternModel from './config/patterns/simple_test.pattern.json' with { type: 'json' };
const patternModels: PatternModel[] = [patternModel as PatternModel];
import engineConfig from './ts/config/engine.json' with { type: 'json' };
StaticEngineConfig.engineConfig = engineConfig;
import agentConfig from './ts/config/session_agent.json' with { type: 'json' };
StaticAgentConfig.agentConfig = agentConfig;

import path from 'node:path';
import url from 'node:url';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// assembly demo
app.get('/assembly', function (req: Request, res: Response) {
    res.sendFile(__dirname + '/web/assembly.html');
});
app.get('/brooms', function (req: Request, res: Response) {
    res.sendFile(__dirname + '/web/brooms.html');
});
app.get('/rms', function (req: Request, res: Response) {
    res.sendFile(__dirname + '/web/rms.html');
});
app.get('/cmms', function (req: Request, res: Response) {
    res.sendFile(__dirname + '/web/cmms.html');
});
app.get('/erp', function (req: Request, res: Response) {
    res.sendFile(__dirname + '/web/erp.html');
});


// mes demo
app.get('/mes', function (req: Request, res: Response) {
    res.sendFile(__dirname + '/web/mes.html');
});
app.get('/erp_heatlot', function (req: Request, res: Response) {
    res.sendFile(__dirname + '/web/erp_heatlot.html');
});
app.get('/mes_db', function (req: Request, res: Response) {
    res.sendFile(__dirname + '/web/mes_db.html');
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

/*
httpServer.listen(443, function () {
    Logger.info('listening on *:443');
});
*/

httpServer.listen(3000, function () {
    Logger.info('listening on *:3000');
});

startServices();

/************End Web Server ************************/

/***
 *     __                 _                     _               
 *    / _\ ___ _ ____   _(_) ___ ___   ___  ___| |_ _   _ _ __  
 *    \ \ / _ \ '__\ \ / / |/ __/ _ \ / __|/ _ \ __| | | | '_ \ 
 *    _\ \  __/ |   \ V /| | (_|  __/ \__ \  __/ |_| |_| | |_) |
 *    \__/\___|_|    \_/ |_|\___\___| |___/\___|\__|\__,_| .__/ 
 *                                                       |_|    
 */



 // Start server
async function startServices() {

    // set up the message broker to be used by all q services in this process
    const qBroker = new RemoteQBroker(rascal_config);

    // set up the remote Qs for the engine
    const engineEventService = await RemoteQService.newInstance<Event>({ qBroker, subName: 'sub_event' });
    const engineEventQ: EventQ = new EventQ(engineEventService);
    const engineMessageService = await RemoteQService.newInstance<Message>({ qBroker, pubName: 'pub_message' });
    const engineMessageQ: MessageQ = new MessageQ(engineMessageService);

    // @TODO separate library
    // setup the Sessions service
    const sessions = new Sessions(sessionsModel, resolverConfig, new SessionStorage(StorageFactory.getStorage()));

    // @TODO separate service
    //  setup the engine server
    const engineServer = new Server(engineEventQ, engineMessageQ, sessions);
    engineServer.start({ patternModels });

    // set up the remote Qs for the session service agent
    const sessionEventService = await RemoteQService.newInstance<Event>({ qBroker, pubName: 'pub_event' });
    const sessionEventQ: EventQ = new EventQ(sessionEventService);
    const sessionMessageService = await RemoteQService.newInstance<Message>({ qBroker, subName: 'sub_session1_message' });
    const sessionMessageQ: MessageQ = new MessageQ(sessionMessageService);
    // create and run a Session Agent

    const agent = new Agent(StaticAgentConfig.agentConfig, sessionEventQ, sessionMessageQ, { httpServer, sessionsModel });
    agent.start();


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
    process.on('SIGINT', function onSigint() {
        Logger.info('Got SIGINT (aka ctrl-c ). Waiting for shutdown...', new Date().toISOString());
        shutdown();
    });

    // quit properly on docker stop
    process.on('SIGTERM', function onSigterm() {
        Logger.info('Got SIGTERM (docker container stop). Graceful shutdown ', new Date().toISOString());
        shutdown();
    })

    // shut down server
    function shutdown() {
        disconnectAll().then(() => {
            Logger.info('Shutdown completed successfully.', new Date().toISOString());
            process.exit(0);
        }).catch((err) =>  {
            Logger.error(`Shutdown error:`, err);
            process.exit(1);
        });
    }

    async function disconnectAll() {
        // await eventService.deleteAll().catch(Logger.error);
        // these disconnect the underlying broker,
        // so we don't have to also disconnect this.messageService

        /*
            Order is important here.
            1) Finish serving Q messages (if any)
               The rascal config value 'deferCloseChannel' determines how long
               to keep the channel open to finish processing messages (that have already been taken)
            2) Shutdown the Agent so that disconnects can prompt session removals
            3) Shutdown the Redis connection
        */

        Logger.info(`Disconnecting RemoteQ broker...`);
        // @TODO
        // Note: if there are unack'd messages unsubscribeAll and shutdown will block indefinitely
        // need to set them up for redelivery
        await engineEventService.disconnect().catch(Logger.error);
        Logger.info(`RemoteQ Broker disconnected successfully.`);
        Logger.info(`Shutting down session agent...`);
        await agent.shutdown();
        Logger.info(`Agent shutdown successfully.`);
        Logger.info(`Disconnecting Redis storage...`);
        await StorageFactory.disconnectAll();
        Logger.info(`Redis storage disconnected successfuly.`);
    }
}

