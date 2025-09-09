import './init.js';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { Logger, LoggerLevel } from './thredlib/index.js';
import { EngineServiceManager } from './engine.js';

/***
 *       __            _                ___       _
 *      /__\ __   __ _(_)_ __   ___    /___\_ __ | |_ ___
 *     /_\| '_ \ / _` | | '_ \ / _ \  //  // '_ \| __/ __|
 *    //__| | | | (_| | | | | |  __/ / \_//| |_) | |_\__ \
 *    \__/|_| |_|\__, |_|_| |_|\___| \___/ | .__/ \__|___/
 *               |___/                     |_|
 */

const args = yargs(hideBin(process.argv))
  .usage('$0 [options]')
  .options('config-name', {
    alias: 'c',
    description: 'The unique name of the engine config for this agent. Used for loading config dynamically.',
    type: 'string',
    default: 'engine',
  })
  .options('config-path', { alias: 'cp', description: 'Path to config file. Overrides config-name', type: 'string' })
  .options('sessions-model', {
    alias: 's',
    description: 'The name of the sessions model config file to use',
    type: 'string',
    default: 'sessions_model',
  })
  .options('sessions-model-path', {
    alias: 'sp',
    description: 'Path to sessions model config file. Overrides sessions-model',
    type: 'string',
  })
  .options('resolver-config', {
    alias: 'r',
    description: 'The name of the resolver config file to use',
    type: 'string',
    default: 'resolver_config',
  })
  .options('resolver-config-path', {
    alias: 'rp',
    description: 'Path to resolver config file. Overrides resolver-config',
    type: 'string',
  })
  .options('rascal-config', {
    alias: 'a',
    description: 'The name of the Rascal config file to use',
    type: 'string',
    default: 'rascal_config',
  })
  .options('rascal-config-path', {
    alias: 'ap',
    description: 'Path to Rascal config file. Overrides rascal-config',
    type: 'string',
  })
  .options('debug', { alias: 'd', description: 'Turn on debug output', type: 'boolean' })
  .help()
  .alias('help', 'h')
  .parseSync();

const configPath = args['config-path'];
args.debug ? Logger.setLevel(LoggerLevel.DEBUG) : Logger.setLevel(LoggerLevel.INFO);

const serviceManager = new EngineServiceManager();
try {
  await serviceManager.startServices({
    configName: args['config-name'],
    configPath: args['config-path'],
    rascalConfigName: args['rascal-config'],
    rascalConfigPath: args['rascal-config-path'],
    sessionsModelName: args['sessions-model'],
    sessionsModelPath: args['sessions-model-path'],
    resolverConfigName: args['resolver-config'],
    resolverConfigPath: args['resolver-config-path'],
  });
} catch (error) {
  Logger.error('Failed to start Engine Service Manager:', error);
  await serviceManager.shutdown(1);
}

/***
 *     __ _                   _                         _ _ _
 *    / _(_) __ _ _ __   __ _| |   /\  /\__ _ _ __   __| | (_)_ __   __ _
 *    \ \| |/ _` | '_ \ / _` | |  / /_/ / _` | '_ \ / _` | | | '_ \ / _` |
 *    _\ \ | (_| | | | | (_| | | / __  / (_| | | | | (_| | | | | | | (_| |
 *    \__/_|\__, |_| |_|\__,_|_| \/ /_/ \__,_|_| |_|\__,_|_|_|_| |_|\__, |
 *          |___/                                                   |___/
 */

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
