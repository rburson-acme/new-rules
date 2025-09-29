import { PatternModel } from '../thredlib/index.js';

export interface EngineConfig {}

export type RunConfig = { patternModels?: PatternModel[] };

export class Config {
  static engineConfig: EngineConfig;
}
