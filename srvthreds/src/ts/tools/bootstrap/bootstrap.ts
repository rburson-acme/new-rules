import 'dotenv/config';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { Logger, LoggerLevel } from '../../thredlib/index.js';
import { cleanup, disconnect, run } from './Bootstrapper.js';

/*
  This utility:
  - Loads the config files in run-profiles/<profile>/run-config into the database
  - Loads any 'active' patterns from persistence into the database and then storage from the directory run-profiles/<profile>/patterns
  - runs the methods cleanup() and run() from the Handler class in run-profiles/<profile>/Handler.ts
*/

Logger.setLevel(LoggerLevel.DEBUG);

const argv = yargs(hideBin(process.argv))
  .usage('$0 [options]')
  .option('profile', {
    alias: 'p',
    type: 'string',
    description: 'The bootstrap profile that you want to load',
    demandOption: true,
  })
  .option('cleanup', {
    alias: 'c',
    type: 'boolean',
    description: 'Run cleanup only',
  })
  .parseSync();

if (argv.cleanup) {
  await cleanup(argv.profile);
} else {
  await run(argv.profile);
}
await disconnect();
