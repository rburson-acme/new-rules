import { ConfigDef } from './ConfigDefs.js';
import { ConfigLoader } from './ConfigLoader.js';

export interface Config<T> {
  // call this to rebuild with updated config
  updateConfig(configDef: T): Promise<void>;
}
