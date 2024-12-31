import { PatternModel } from '../thredlib/index.js';

export interface EngineConfig {
    agents?:
        {
            name: string;
            nodeType: string;
            address: string;
        }[]
}
export type RunConfig = { patternModels?: PatternModel[] }

export class Config {
    static engineConfig: EngineConfig;
}
