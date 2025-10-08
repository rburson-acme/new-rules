import * as fs from 'fs';
import * as path from 'path';
import { SystemController } from '../persistence/controllers/SystemController.js';
import { PatternsStore } from '../engine/store/PatternsStore.js';
import { Storage } from '../storage/Storage.js';
import { Logger, Series } from '../thredlib/index.js';

export class ConfigLoader {
  static async loadStorageFromPersistence(persistenceManager: SystemController, storage: Storage): Promise<void> {
    const patternModels = await persistenceManager.getAllActivePatterns();
    const patternsStore = new PatternsStore(storage);
    if (patternModels) await patternsStore.addPatterns(patternModels);
  }

  static async loadPersistenceWithConfigFiles(persistenceManager: SystemController, directory: string) {
    const files = fs.readdirSync(directory);
    const jsonFiles = files.filter((file) => path.extname(file) === '.json');
    return Series.forEach(jsonFiles, async (file) => {
      const configName = file.substring(0, file.indexOf('.json'));
      const filePath = path.join(directory, file);
      const fileContents = fs.readFileSync(filePath, 'utf-8');
      const jsonData = JSON.parse(fileContents);
      Logger.info(`Persisting config ${configName} from ${filePath}`);
      return persistenceManager.upsertConfig(configName, jsonData);
    });
  }

  static loadConfigFileFromPath(configPath: string): Promise<any> {
    return new Promise((resolve, reject) => {
      fs.readFile(configPath, 'utf-8', (err, data) => {
        if (err) {
          Logger.error(`Error loading config from path: ${configPath}`, err);
          reject(new Error(`Failed to load config from path: ${configPath}`, { cause: err }));
        } else {
          try {
            const config = JSON.parse(data);
            resolve(config);
          } catch (parseError) {
            Logger.error(`Error parsing config file: ${configPath}`, parseError);
            reject(new Error(`Failed to parse config file: ${configPath}`, { cause: parseError }));
          }
        }
      });
    });
  }

  static async getFromNameOrPath(configName?: string, configPath?: string): Promise<any | null> {
    if (configPath) {
      return ConfigLoader.loadConfigFileFromPath(configPath);
    } else {
      if (configName) {
        return SystemController.get().getConfig(configName);
      }
    }
  }
}
