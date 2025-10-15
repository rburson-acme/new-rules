import 'dotenv/config';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { SystemController } from '../ts/persistence/controllers/SystemController.js';
import { Logger, LoggerLevel, Series } from '../ts/thredlib/index.js';
import { ConfigLoader } from '../ts/config/ConfigLoader.js';
import { StorageFactory } from '../ts/storage/StorageFactory.js';
import { PersistenceFactory } from '../ts/persistence/PersistenceFactory.js';

Logger.setLevel(LoggerLevel.DEBUG);

export interface BootstrapHandler {
  run(): Promise<void>;
  cleanup(): Promise<void>;
}

/*
  This utility:
  - Loads the config files in run-profiles/<profile>/run-config into the database
  - Loads any 'active' patterns from persistence into the database and then storage from the directory run-profiles/<profile>/patterns
  - runs the methods cleanup() and run() from the Handler class in run-profiles/<profile>/Handler.ts
*/

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function retrievePatterns(directory: string): any[] {
  const patterns: any[] = [];
  const files = fs.readdirSync(directory);
  const jsonFiles = files.filter((file) => path.extname(file) === '.json');
  jsonFiles.forEach((file) => {
    const filePath = path.join(directory, file);
    const fileContents = fs.readFileSync(filePath, 'utf-8');
    const jsonData = JSON.parse(fileContents);
    patterns.push(jsonData);
  });

  return patterns;
}

async function persistPatterns(patterns: any[]): Promise<void> {
  await Series.forEach(patterns, async (pattern) => {
    await SystemController.get().upsertPattern(pattern);
  });
}

async function loadPatternsIntoStorage() {
  await ConfigLoader.loadStorageFromPersistence(SystemController.get(), StorageFactory.getStorage());
}

//@TODO add optional run argument w/ that allows for hot reload of pattern (and doesn't clear/reset storeage)

async function run(profile: string) {
  Logger.info('  > Clearing database and storage...');
  await PersistenceFactory.removeDatabase();
  await StorageFactory.purgeAll();

  // load the supplied handler
  Logger.info(`  > Initializing Handler from run-profiles/${profile}/Handler.js...`);
  const handler = await getHandler(path.join(__dirname, `../../run-profiles/${profile}`));
  Logger.info('  > Running handler cleanup()...');
  await handler?.cleanup();

  Logger.info(`  > Loading config files in run-profiles/${profile}/run-config into database...`);
  const runConfigDirectory = path.join(__dirname, `../../run-profiles/${profile}/run-config`);
  await ConfigLoader.loadPersistenceWithConfigFiles(SystemController.get(), runConfigDirectory);

  Logger.info(`  > Loading patterns from run-profiles/${profile}/patterns into database...`);
  const relativeDirectory = path.join(__dirname, `../../run-profiles/${profile}/patterns`);
  const patterns = retrievePatterns(relativeDirectory);
  await persistPatterns(patterns);
  Logger.info(`  > Loading patterns from run-profiles/${profile}/patterns into storage...`);
  await loadPatternsIntoStorage();

  Logger.info('  > Running handler run()...');
  await handler?.run();

  await StorageFactory.getStorage().disconnect();
  await PersistenceFactory.disconnectAll();
  Logger.info('  > Done!');
}

async function cleanup(profile: string) {
  Logger.info('  > Cleaning up database and storage...');
  await PersistenceFactory.removeDatabase();
  await StorageFactory.purgeAll();
  // load the supplied handler
  Logger.info(`  > Initializing Handler from run-profiles/${profile}/Handler.js...`);
  const handler = await getHandler(path.join(__dirname, `../../run-profiles/${profile}`));
  Logger.info('  > Running handler cleanup()...');
  await handler?.cleanup();
}

async function getHandler(handlerDirectory: string): Promise<BootstrapHandler | undefined> {
  try {
    let Handler;
    const module = await import(`${handlerDirectory}/Handler.js`);
    if (module && module.default) {
      Handler = module.default;
      return new Handler();
    }
  } catch (e) {
    Logger.error('Bootstrap: Failed to initialize Handler', e);
    throw e;
  }
}

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
