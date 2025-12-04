/**
 * Caches configuration instances for different configuration types within the application.
 *
 * This class implements the singleton pattern to ensure a single instance is used throughout the app.
 * It provides methods to load, update, and retrieve configuration objects, supporting dynamic reloading.
 *
 * @remarks
 * - Use {@link ConfigManager.get} to obtain the singleton instance.
 * - Configurations are stored and accessed by their {@link ConfigType}.
 *
 * @example
 * ```typescript
 * const configManager = ConfigManager.get();
 * const engineConfig = configManager.getConfig<EngineConfig>('engine-config');
 * ```
 */
import { Logger } from '../thredlib/index.js';
import { Config } from './Config.js';
import { ConfigLoader } from './ConfigLoader.js';

export class ConfigManager {
  private static instance: ConfigManager;

  private configs: Record<ConfigType, Config<any>> = {} as Record<ConfigType, Config<any>>;

  private constructor() {}

  public static get(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  // call to reload a config and update the underlying config instance
  // D is the configDef type and T is an instance of the actual Config class
  async loadConfig<D, T extends Config<D>>({
    type,
    config,
    configName,
    configPath,
  }: {
    type: ConfigType;
    config: T;
    configName?: string;
    configPath?: string;
  }): Promise<T> {
    const configDef = (await ConfigLoader.loadFromNameOrPath(configName, configPath)) as D;
    await config.updateConfig(configDef);
    this.configs[type] = config;
    Logger.debug(`ConfigManager: Loaded ${configName ?? configPath} for type ${type}`);
    return config;
  }

  getConfig<T extends Config<any>>(type: ConfigType): T {
    return this.configs[type] as T;
  }

  unloadAll() {
    this.configs = {} as Record<ConfigType, Config<any>>;
  }
}

export type ConfigType = 'engine-config' | 'rascal-config' | 'sessions-model' | 'resolver-config' | 'agent-config';
