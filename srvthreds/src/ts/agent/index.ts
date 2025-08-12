import { Event, Logger, LoggerLevel, Message } from '../thredlib/index.js';
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

class Server {
  private eventService?: RemoteQService<Event>;
  private agent?: Agent;

  async start({
    configName,
    configPath,
    rascalConfigName,
    rascalConfigPath,
    additionalArgs,
  }: {
    configName: string;
    configPath?: string;
    rascalConfigName?: string;
    rascalConfigPath?: string;
    additionalArgs?: Record<string, any>;
  }) {
    const agentConfig = await SystemController.get().getFromNameOrPath(configName, configPath);
    if (!agentConfig) throw new Error(`Agent: failed to load config for ${configName} or configPath: ${configPath}`);

    const rascal_config = await SystemController.get().getFromNameOrPath(rascalConfigName, rascalConfigPath);
    if (!rascal_config)
      throw new Error(
        `Failed to load Rascal config from configName: ${rascalConfigName} or configPath: ${rascalConfigPath}`,
      );

    // set up the remote Qs
    const qBroker = new RemoteQBroker(rascal_config);
    this.eventService = await RemoteQService.newInstance<Event>({ qBroker, pubName: 'pub_event' });
    const eventQ: EventQ = new EventQ(this.eventService);
    const messageService = await RemoteQService.newInstance<Message>({
      qBroker,
      subName: agentConfig.subscriptionName,
    });
    const messageQ: MessageQ = new MessageQ(messageService);
    // connect to persistence
    await SystemController.get().connect();
    this.agent = new Agent({
      configName,
      agentConfig: agentConfig,
      eventQ: eventQ,
      messageQ: messageQ,
      additionalArgs,
    });
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
    } catch (e) {
      Logger.error(e);
      process.exitCode = 1;
    }
    process.exit(0);
  }
}

const args = yargs(hideBin(process.argv))
  .usage('$0 [options]')
  .options('config-name', {
    alias: 'c',
    description: 'The unique name of the config for this agent. Used for loading config dynamically.',
    type: 'string',
    demandOption: true,
  })
  .options('config-path', { alias: 'cp', description: 'Path to config file. Overrides config-name', type: 'string' })
  .options('rascal-config', {
    alias: 'rc',
    description: 'The name of the Rascal config file to use',
    type: 'string',
    default: 'rascal_config',
  })
  .options('rascal-config-path', {
    alias: 'rcp',
    description: 'Path to Rascal config file. Overrides rascal-config',
    type: 'string',
  })
  .options('arg', {
    alias: 'a',
    description: 'Additional arguments to be passed to the agent (overrides config) ex. --arg.dbname="demo" --arg.port=3000',
  })
  .options('debug', { alias: 'd', description: 'Turn on debug output', type: 'boolean' })
  .help()
  .alias('help', 'h')
  .parseSync();

const configPath = args['config-path'];
const additionalArgs = args.arg as Record<string, any> | undefined;
args.debug ? Logger.setLevel(LoggerLevel.DEBUG) : Logger.setLevel(LoggerLevel.INFO);

const server = new Server();
server.start({
  configName: args['config-name'],
  configPath: configPath,
  rascalConfigName: args['rascal-config'],
  rascalConfigPath: args['rascal-config-path'],
  additionalArgs,
});

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
let shuttingDown = false;
process.on('SIGINT', async function onSigint() {
  if (shuttingDown) {
    Logger.info('Got SIGINT (aka ctrl-c ) again. Shutdown pending...', new Date().toISOString());
  } else {
    shuttingDown = true;
    Logger.info('Got SIGINT (aka ctrl-c ). Waiting for shutdown...', new Date().toISOString());
    await server.shutdown();
  }
});

// quit properly on docker stop
process.on('SIGTERM', async function onSigterm() {
  if (shuttingDown) {
    Logger.info('Got SIGTERM (aka ctrl-c ) again. Shutdown pending...', new Date().toISOString());
  } else {
    shuttingDown = true;
    Logger.info('Got SIGTERM (docker container stop). Graceful shutdown ', new Date().toISOString());
    await server.shutdown();
  }
});
