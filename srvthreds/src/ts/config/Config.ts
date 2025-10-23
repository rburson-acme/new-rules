import { ConfigDef } from './ConfigDefs.js';
import { ConfigLoader } from './ConfigLoader.js';

/**
 * Configs are objects that should be able to be updated in-place, with new Configuration Definitions.
 */
export interface Config<T> {
  // call this to rebuild with updated config
  updateConfig(configDef: T): Promise<void>;
}
