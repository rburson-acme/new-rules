import { Logger, LoggerLevel } from '../thredlib/index.js';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { SystemController } from '../persistence/controllers/SystemController.js';
import { RemoteAgentService } from './RemoteAgentService.js';

/***
 *     __                 _                     _
 *    / _\ ___ _ ____   _(_) ___ ___   ___  ___| |_ _   _ _ __
 *    \ \ / _ \ '__\ \ / / |/ __/ _ \ / __|/ _ \ __| | | | '_ \
 *    _\ \  __/ |   \ V /| | (_|  __/ \__ \  __/ |_| |_| | |_) |
 *    \__/\___|_|    \_/ |_|\___\___| |___/\___|\__|\__,_| .__/
 *                                                       |_|
 */

class Server {
  private agent?: RemoteAgentService;

  async start({ configPath, additionalArgs }: { configPath?: string; additionalArgs?: Record<string, any> }) {
    const agentConfig = await SystemController.get().getFromNameOrPath(undefined, configPath);
    if (!agentConfig) throw new Error(`Agent: failed to load config for configPath: ${configPath}`);

    this.agent = new RemoteAgentService({
      agentConfig: agentConfig,
      additionalArgs,
    });
    await this.agent.start();
  }

  async shutdown(): Promise<void> {
    try {
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
  .options('config-path', { alias: 'cp', description: 'Path to config file. Overrides config-name', type: 'string' })
  .options('arg', {
    alias: 'a',
    description:
      'Additional arguments to be passed to the agent (overrides config) ex. --arg.dbname="demo" --arg.port=3000',
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
  configPath: configPath,
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
