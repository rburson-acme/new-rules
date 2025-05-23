import { Event, Logger, Message } from '../thredlib/index.js';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { EventQ } from '../queue/EventQ.js';
import { MessageQ } from '../queue/MessageQ.js';
import rascal_config from '../config/rascal_config.json' with { type: 'json' };
import { RemoteQBroker } from '../queue/remote/RemoteQBroker.js';
import { RemoteQService } from '../queue/remote/RemoteQService.js';
import { Agent } from './Agent.js';
import { SystemController } from '../persistence/controllers/SystemController.js';

/***
 *     __                 _                     _               
 *    / _\ ___ _ ____   _(_) ___ ___   ___  ___| |_ _   _ _ __  
 *    \ \ / _ \ '__\ \ / / |/ __/ _ \ / __|/ _ \ __| | | | '_ \ 
 *    _\ \  __/ |   \ V /| | (_|  __/ \__ \  __/ |_| |_| | |_) |
 *    \__/\___|_|    \_/ |_|\___\___| |___/\___|\__|\__,_| .__/ 
 *                                                       |_|    
 */

class Server  {

    private eventService?: RemoteQService<Event>;
    private agent?: Agent;

    async start(configName: string, configFile?: string) {
        const agentConfig = configFile ? await import(configFile) : undefined;
        // set up the remote Qs
        const qBroker = new RemoteQBroker(rascal_config);
        this.eventService = await RemoteQService.newInstance<Event>({ qBroker, pubName: 'pub_event' });
        const eventQ: EventQ = new EventQ(this.eventService);
        const messageService = await RemoteQService.newInstance<Message>({ qBroker, subName: agentConfig.subscriptionName });
        const messageQ: MessageQ = new MessageQ(messageService);
        // connect to persistence
        await SystemController.get().connect();
        this.agent = new Agent({ configName, agentConfig: agentConfig, eventQ:eventQ, messageQ: messageQ });
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
    .options('config-name', { alias: 'n', description: 'The unique name of the config for this agent. Used for loading config dynamically.', type: 'string'})
    .options('config', { alias: 'c', description: 'Path to config file. Overrides config-name', type: 'string'})
    .demandOption('config-name', 'config-name is required')
    .help()
    .alias('help', 'h').parseSync();

const configPath = args.config;

const server = new Server();
server.start(args['config-name'], configPath);



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