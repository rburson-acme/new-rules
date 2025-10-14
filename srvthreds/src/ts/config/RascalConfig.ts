import { Config } from './Config.js';
import { RascalConfigDef } from './ConfigDefs.js';

export class RascalConfig implements Config<RascalConfigDef> {
  configDef?: RascalConfigDef;

  constructor(configDef?: RascalConfigDef) {
    if (configDef) {
      this.configDef = configDef;
    }
  }

  async updateConfig(configDef: RascalConfigDef): Promise<void> {
    this.configDef = configDef;
  }
}
