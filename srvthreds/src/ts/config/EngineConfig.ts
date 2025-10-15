import { Config } from './Config.js';
import { EngineConfigDef } from './ConfigDefs.js';

export class EngineConfig implements Config<EngineConfigDef> {
  private configDef?: EngineConfigDef;

  async updateConfig(configDef: EngineConfigDef): Promise<void> {
    this.configDef = configDef;
  }
}
