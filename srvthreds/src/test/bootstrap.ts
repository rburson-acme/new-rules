import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { SystemController } from '../ts/persistence/controllers/SystemController';
import { Logger, LoggerLevel, Series } from '../ts/thredlib';
import { ConfigLoader } from '../ts/config/ConfigLoader';
import { StorageFactory } from '../ts/storage/StorageFactory';
import { PersistenceFactory } from '../ts/persistence/PersistenceFactory';
import { UserController } from '../ts/persistence/controllers/UserController';

Logger.setLevel(LoggerLevel.DEBUG);

/*
  This utility:
  - Loads the config files in ./run-config into the database
  - Loads the patterns in ./src/ts/config/patterns into the database
  - Loads any 'active' patterns from persistence into storage
  - Loads demo objects into the database
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

// demo
async function loadDemoObjects() {
  await PersistenceFactory.connect();
  const persistence = PersistenceFactory.getPersistence({ dbname: 'demo' });
  await persistence.upsert({
    type: 'ContactInfo',
    values: { id: '0', contactId: 'participant0' },
    matcher: { sensorId: '0' },
  });
  await persistence.upsert({
    type: 'ContactInfo',
    values: { id: '1', contactId: 'participant1' },
    matcher: { sensorId: '1' },
  });
  await persistence.upsert({
    type: 'ContactInfo',
    values: { id: '2', contactId: 'participant2' },
    matcher: { sensorId: '2' },
  });
  await persistence.upsert({
    type: 'ContactInfo',
    values: { id: '3', contactId: 'participant3' },
    matcher: { sensorId: '3' },
  });
  UserController.get().replaceUser({ id: 'sensor_agent0', password: 'password0' });
}

async function createTestUsers() {
  const uc = UserController.get();
  uc.replaceUser({ id: 'participant0', password: 'password0' });
  uc.replaceUser({ id: 'participant1', password: 'password1' });
  uc.replaceUser({ id: 'participant2', password: 'password2' });
  uc.replaceUser({ id: 'participant3', password: 'password3' });
}

//@TODO add optional run argument w/ that allows for hot reload of pattern (and doesn't clear/reset storeage)

async function run() {
  Logger.info('  > Clearing database and storage...');
  await PersistenceFactory.removeDatabase();
  await StorageFactory.purgeAll();
  await SystemController.get().connect();
  await UserController.get().connect();

  Logger.info('  > Loading config files in ./run-config into database...');
  const runConfigDirectory = path.join(__dirname, '../../run-config');
  await ConfigLoader.loadPersistenceWithConfigFiles(SystemController.get(), runConfigDirectory);

  Logger.info('  > Loading patterns into database...');
  const relativeDirectory = path.join(__dirname, '../ts/config/patterns');
  const patterns = retrievePatterns(relativeDirectory);
  await persistPatterns(patterns);
  Logger.info('  > Loading patterns into storage...');
  await loadPatternsIntoStorage();

  // create test users
  await createTestUsers();
  //demo
  await loadDemoObjects();

  await StorageFactory.getStorage().disconnect();
  await PersistenceFactory.disconnectAll();
  Logger.info('  > Done!');
}

await run();
