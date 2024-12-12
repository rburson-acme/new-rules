import { Event, Logger, Message } from '../thredlib/index.js';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { EventQ } from '../queue/EventQ.js';
import { MessageQ } from '../queue/MessageQ.js';
import config from '../config/rascal_config.json' with { type: 'json' };
import { RemoteQBroker } from '../queue/remote/RemoteQBroker.js';
import { RemoteQService } from '../queue/remote/RemoteQService.js';
import { Agent } from './Agent.js';
import { Config } from './Config.js';

/***
 *     __                 _                     _               
 *    / _\ ___ _ ____   _(_) ___ ___   ___  ___| |_ _   _ _ __  
 *    \ \ / _ \ '__\ \ / / |/ __/ _ \ / __|/ _ \ __| | | | '_ \ 
 *    _\ \  __/ |   \ V /| | (_|  __/ \__ \  __/ |_| |_| | |_) |
 *    \__/\___|_|    \_/ |_|\___\___| |___/\___|\__|\__,_| .__/ 
 *                                                       |_|    
 */

const defaultConfigFile = '../config/agent_config.json'

class Server  {

    private eventService?: RemoteQService<Event>;
    private agent?: Agent;

    async start(configFile: string) {
        Config.agentConfig = await import(configFile);
        // set up the remote Qs
        const qBroker = new RemoteQBroker(config);
        this.eventService = await RemoteQService.newInstance<Event>({ qBroker, pubName: 'pub_event' });
        const eventQ: EventQ = new EventQ(this.eventService);
        const messageService = await RemoteQService.newInstance<Message>({ qBroker, subName: Config.agentConfig.subscriptionName });
        const messageQ: MessageQ = new MessageQ(messageService);
        this.agent = new Agent(Config.agentConfig, eventQ, messageQ);
        await this.agent.start();
    }

    async shutdown(): Promise<void> {
        try {
            Logger.info(`Disconnecting RemoteQ broker...`);
            await this.eventService?.disconnect().catch(Logger.error);
            Logger.info(`RemoteQ Broker disconnected successfully.`);
            Logger.info(`Shutting down session agent...`);
            await this.agent?.shutdown().catch(Logger.error);
            Logger.info(`Agent shutdown successfully.`);
        } catch(e) {
            Logger.error(e);
            process.exitCode = 1;
        }
        process.exit(0);
    }
}


const args = yargs(hideBin(process.argv)).usage('$0 [options]')
    .options('config', { alias: 'c', description: 'Path to config file', type: 'string'})
    .help()
    .alias('help', 'h').parseSync();

const configFile = args.config || defaultConfigFile;

const server = new Server();
server.start(configFile);



/***
 *     __                              ___ _                              
 *    / _\ ___ _ ____   _____ _ __    / __\ | ___  __ _ _ __  _   _ _ __  
 *    \ \ / _ \ '__\ \ / / _ \ '__|  / /  | |/ _ \/ _` | '_ \| | | | '_ \ 
 *    _\ \  __/ |   \ V /  __/ |    / /___| |  __/ (_| | | | | |_| | |_) |
 *    \__/\___|_|    \_/ \___|_|    \____/|_|\___|\__,_|_| |_|\__,_| .__/ 
 *                                                                 |_|    
 *
 */
// quit on ctrl-c when running docker in terminal
process.on('SIGINT', function onSigint() {
    Logger.info('Got SIGINT (aka ctrl-c ). Waiting for shutdown...', new Date().toISOString());
    server.shutdown();
});

// quit properly on docker stop
process.on('SIGTERM', function onSigterm() {
    Logger.info('Got SIGTERM. Graceful shutdown ', new Date().toISOString());
    server.shutdown();
})