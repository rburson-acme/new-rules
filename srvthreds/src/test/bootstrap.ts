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
  const persistence = PersistenceFactory.getPersistence({ dbname: 'demo' });
  await persistence.upsert({
    type: 'ContactInfo',
    values: { id: '0', contactId: 'participant0', sensorId: '0' },
    matcher: { sensorId: '0' },
  });
  await persistence.upsert({
    type: 'ContactInfo',
    values: { id: '1', contactId: 'participant1', sensorId: '1' },
    matcher: { sensorId: '1' },
  });
  await persistence.upsert({
    type: 'ContactInfo',
    values: { id: '2', contactId: 'participant2', sensorId: '2' },
    matcher: { sensorId: '2' },
  });
  await persistence.upsert({
    type: 'ContactInfo',
    values: { id: '3', contactId: 'participant3', sensorId: '3' },
    matcher: { sensorId: '3' },
  });
  await UserController.get().replaceUser({ id: 'sensor_agent0', password: 'password0' });
}

// test
async function createTestData() {
  const persistence = PersistenceFactory.getPersistence({ dbname: 'test' });
  await persistence.upsert({
    type: 'TestObject',
    values: { id: '0', participantId: 'participant0', locationId: '0' },
    matcher: { locationId: '0' },
  });
  await persistence.upsert({
    type: 'TestObject',
    values: { id: '1', participantId: 'participant1', locationId: '1' },
    matcher: { locationId: '1' },
  });
  await persistence.upsert({
    type: 'TestObject',
    values: { id: '2', participantId: 'participant2', locationId: '2' },
    matcher: { locationId: '2' },
  });
  await persistence.upsert({
    type: 'TestObject',
    values: { id: '3', participantId: 'participant3', locationId: '3' },
    matcher: { locationId: '3' },
  });
}


async function createTestUsers() {
  const uc = UserController.get();
  await uc.replaceUser({ id: 'participant0', password: 'password0' });
  await uc.replaceUser({ id: 'participant1', password: 'password1' });
  await uc.replaceUser({ id: 'participant2', password: 'password2' });
  await uc.replaceUser({ id: 'participant3', password: 'password3' });
}

//@TODO add optional run argument w/ that allows for hot reload of pattern (and doesn't clear/reset storeage)

async function run() {
  Logger.info('  > Clearing database and storage...');
  await PersistenceFactory.removeDatabase();
  await PersistenceFactory.removeDatabase({ dbname: 'test' });
  await PersistenceFactory.removeDatabase({ dbname: 'demo' });
  await StorageFactory.purgeAll();

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
  await createTestData();
  //demo
  await loadDemoObjects();

  await StorageFactory.getStorage().disconnect();
  await PersistenceFactory.disconnectAll();
  Logger.info('  > Done!');
}

await run();
