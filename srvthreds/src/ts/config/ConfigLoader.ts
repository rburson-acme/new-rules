import * as fs from 'fs';
import * as path from 'path';
import { SystemController } from '../persistence/controllers/SystemController.js';
import { PatternsStore } from '../engine/store/PatternsStore.js';
import { Storage } from '../storage/Storage.js';
import { Logger, Series } from '../thredlib/index.js';

/*
 This class loads but does not cache configuration files.  See ConfigManager for caching configs.
  */

export class ConfigLoader {
  static async loadAllActivePatternsFromPersistence(
    persistenceManager: SystemController,
    storage: Storage,
  ): Promise<void> {
    Logger.info('Reloading all active patterns from persistence');
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

  /**
   * Load configuration either from a specified file path or from the persistence layer using a config name.
   * If both configPath and configName are provided, configPath takes precedence.
   * @param configName The name of the configuration to load from persistence.
   * @param configPath The file path to load the configuration from.
   * @returns The loaded configuration object or null if not found.
   */

  static async loadFromNameOrPath(configName?: string, configPath?: string): Promise<any | null> {
    if (configPath) {
      return ConfigLoader.loadConfigFileFromPath(configPath);
    } else {
      if (configName) {
        return this.substituteEnvVarsForObject(await SystemController.get().getConfig(configName));
      }
    }
  }

  static loadConfigFileFromPath(configPath: string): Promise<any> {
    return new Promise((resolve, reject) => {
      fs.readFile(configPath, 'utf-8', (err, data) => {
        if (err) {
          Logger.error(`Error loading config from path: ${configPath}`, err);
          reject(new Error(`Failed to load config from path: ${configPath}`, { cause: err }));
        } else {
          try {
            // Substitute environment variables in the config file
            const substitutedData = ConfigLoader.substituteEnvVars(data);
            const config = JSON.parse(substitutedData);
            resolve(config);
          } catch (parseError) {
            Logger.error(`Error parsing config file: ${configPath}`, parseError);
            reject(new Error(`Failed to parse config file: ${configPath}`, { cause: parseError }));
          }
        }
      });
    });
  }

  /**
   * Substitutes environment variables in a string.
   * Supports syntax: ${VAR_NAME} or ${VAR_NAME||default_value}
   * Examples:
   *   ${MONGO_HOST} -> process.env.MONGO_HOST
   *   ${MONGO_HOST||localhost:27017} -> process.env.MONGO_HOST || 'localhost:27017'
   */
  private static substituteEnvVars(content: string): string {
    return content.replace(/\$\{([^}]+)\}/g, (match, varExpr) => {
      const [varName, defaultValue] = varExpr.split('||').map((s: string) => s.trim());
      return process.env[varName] || defaultValue || '';
    });
  }

  /**
   * Recursively substitute environment variables in an object.
   */
  private static substituteEnvVarsForObject(obj: any): any {
    if (typeof obj === 'string') {
      return ConfigLoader.substituteEnvVars(obj);
    } else if (typeof obj === 'object') {
      for (const key in obj) {
        obj[key] = ConfigLoader.substituteEnvVarsForObject(obj[key]);
      }
    }
    return obj;
  }
}
