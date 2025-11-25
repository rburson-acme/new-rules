/**
 * Shared configuration loading utilities
 */

import * as fs from 'fs';
import * as path from 'path';
import { logger } from './logger.js';

export interface ConfigLoaderOptions {
  configDir: string;
  context?: string;
}

export class ConfigLoader {
  private configDir: string;
  private context: string;
  private cache: Map<string, any> = new Map();

  constructor(options: ConfigLoaderOptions) {
    this.configDir = options.configDir;
    this.context = options.context || 'ConfigLoader';

    if (!fs.existsSync(this.configDir)) {
      throw new Error(`Config directory not found: ${this.configDir}`);
    }

    logger.debug(`Initialized with config directory: ${this.configDir}`, this.context);
  }

  /**
   * Load a JSON configuration file
   */
  loadConfig<T>(filename: string, useCache: boolean = true): T {
    if (useCache && this.cache.has(filename)) {
      logger.debug(`Using cached config: ${filename}`, this.context);
      return this.cache.get(filename);
    }

    const filePath = path.join(this.configDir, filename);

    if (!fs.existsSync(filePath)) {
      throw new Error(`Config file not found: ${filePath}`);
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const config = JSON.parse(content) as T;

      if (useCache) {
        this.cache.set(filename, config);
      }

      logger.debug(`Loaded config: ${filename}`, this.context);
      return config;
    } catch (error: any) {
      throw new Error(`Failed to load config ${filename}: ${error.message}`);
    }
  }

  /**
   * Load all JSON files from a directory
   */
  loadAllConfigs<T>(pattern: string = '*.json'): Map<string, T> {
    const configs = new Map<string, T>();

    try {
      const files = fs.readdirSync(this.configDir);
      const jsonFiles = files.filter((f) => f.endsWith('.json'));

      for (const file of jsonFiles) {
        try {
          const config = this.loadConfig<T>(file);
          configs.set(file, config);
        } catch (error: any) {
          logger.warn(`Failed to load config file ${file}: ${error.message}`, this.context);
        }
      }

      logger.debug(`Loaded ${configs.size} config files`, this.context);
      return configs;
    } catch (error: any) {
      throw new Error(`Failed to load configs from directory: ${error.message}`);
    }
  }

  /**
   * Validate that a config has required fields
   */
  validateConfig<T>(config: T, requiredFields: string[]): boolean {
    const configObj = config as any;

    for (const field of requiredFields) {
      if (!(field in configObj)) {
        throw new Error(`Missing required field in config: ${field}`);
      }
    }

    return true;
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
    logger.debug(`Cache cleared`, this.context);
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

/**
 * Helper function to create a config loader for a specific directory
 */
export function createConfigLoader(configDir: string, context?: string): ConfigLoader {
  return new ConfigLoader({ configDir, context });
}

