import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { PersistenceManager } from '../ts/engine/persistence/PersistenceManager';
import { Logger, LoggerLevel, Series } from '../ts/thredlib';
import { ConfigLoader } from '../ts/config/ConfigLoader';
import { StorageFactory } from '../ts/storage/StorageFactory';
import { PersistenceFactory } from '../ts/persistence/PersistenceFactory';

Logger.setLevel(LoggerLevel.DEBUG);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadPatterns(directory: string): any[] {
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
    return PersistenceManager.get().upsertPattern(pattern);
  });
}

async function loadPatternsIntoStorage() {
  await ConfigLoader.loadStorageFromPersistence(PersistenceManager.get(), StorageFactory.getStorage());
}

//@TODO add optional run argument w/ that allows for hot reload of pattern (and doesn't clear/reset storeage)

async function run() {
  Logger.info('  > Clearing database and storage...')
  await PersistenceFactory.removeDatabase();
  await StorageFactory.purgeAll();
  Logger.info('  > Loading patterns into database...');
  await PersistenceManager.get().connect();
  const relativeDirectory = path.join(__dirname, '../ts/config/patterns');
  const patterns = loadPatterns(relativeDirectory);
  await persistPatterns(patterns);
  Logger.info('  > Loading patterns into storage...');
  await loadPatternsIntoStorage();
  await StorageFactory.getStorage().disconnect();
  await PersistenceManager.get().disconnect();
  Logger.info('  > Done!');
}

await run();
