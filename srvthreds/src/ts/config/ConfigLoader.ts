import * as fs from 'fs';
import * as path from 'path';
import { PersistenceManager } from '../persistence/PersistenceManager';
import { PatternsStore } from '../engine/store/PatternsStore';
import { Storage } from '../storage/Storage';
import { Logger, Series } from '../thredlib';

export class ConfigLoader {
  static async loadStorageFromPersistence(persistenceManager: PersistenceManager, storage: Storage): Promise<void> {
    const patternModels = await persistenceManager.getAllActivePatterns();
    const patternsStore = new PatternsStore(storage);
    if (patternModels) await patternsStore.addPatterns(patternModels);
  }

  static async loadConfig(persistenceManager: PersistenceManager, configName: string): Promise<any | null> {
    return persistenceManager.getConfig(configName);
  }

  static async loadPersistenceWithConfigFiles(persistenceManager: PersistenceManager, directory: string) {
    const files = fs.readdirSync(directory);
    const jsonFiles = files.filter((file) => path.extname(file) === '.json');
    return Series.forEach(jsonFiles, async (file) => {
      const configName = file.substring(0, file.indexOf('.json'));
      const filePath = path.join(directory, file);
      const fileContents = fs.readFileSync(filePath, 'utf-8');
      const jsonData = JSON.parse(fileContents);
      Logger.info(`Persisting config ${configName} from ${filePath}`);
      return persistenceManager.saveConfig(configName, jsonData);
    });
  }
}
