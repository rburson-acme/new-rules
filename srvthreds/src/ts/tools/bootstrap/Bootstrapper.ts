import 'dotenv/config';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { SystemController } from '../../persistence/controllers/SystemController.js';
import { Logger, LoggerLevel, Series } from '../../thredlib/index.js';
import { ConfigLoader } from '../../config/ConfigLoader.js';
import { StorageFactory } from '../../storage/StorageFactory.js';
import { PersistenceFactory } from '../../persistence/PersistenceFactory.js';

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

export async function run(profile: string) {
  const profileDirectory = path.join(__dirname, `../../../../run-profiles/${profile}`);
  Logger.info('  > Clearing database and storage...');
  await PersistenceFactory.removeDatabase();
  await StorageFactory.purgeAll();

  // load the supplied handler
  Logger.info(`  > Initializing Handler from run-profiles/${profile}/Handler.js...`);
  const handler = await getHandler(profileDirectory);
  Logger.info('  > Running handler cleanup()...');
  await handler?.cleanup();

  Logger.info(`  > Loading config files in run-profiles/${profile}/run-config into database...`);
  const runConfigDirectory = `${profileDirectory}/run-config`;
  await ConfigLoader.loadPersistenceWithConfigFiles(SystemController.get(), runConfigDirectory);

  Logger.info(`  > Loading patterns from run-profiles/${profile}/patterns into database...`);
  const patternDirectory = `${profileDirectory}/patterns`;
  const patterns = retrievePatterns(patternDirectory);
  await persistPatterns(patterns);
  Logger.info(`  > Loading patterns from run-profiles/${profile}/patterns into storage...`);
  await loadPatternsIntoStorage();

  Logger.info('  > Running handler run()...');
  await handler?.run();

  Logger.info('  > Done!');
}

export async function disconnect() {
  Logger.info('  > Disconnecting from storage and persistence...');
  await StorageFactory.getStorage().disconnect();
  await PersistenceFactory.disconnectAll();
  Logger.info('  > Disconnected.');
}

export async function cleanup(profile: string) {
  const profileDirectory = path.join(__dirname, `../../../../run-profiles/${profile}`);
  Logger.info('  > Cleaning up database and storage...');
  await PersistenceFactory.removeDatabase();
  await StorageFactory.purgeAll();
  // load the supplied handler
  Logger.info(`  > Initializing Handler from run-profiles/${profile}/Handler.js...`);
  const handler = await getHandler(profileDirectory);
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
