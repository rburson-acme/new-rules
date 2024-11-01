import { ConditionModel } from './ConditionModel.js';
import { FilterModel } from './FilterModel.js';
import { TransitionModel } from './TransitionModel.js';
export interface ReactionModel {
    readonly name?: string;
    readonly description?: string;
    readonly condition: ConditionModel | FilterModel;
    readonly expiry?: {
        interval: number;
        transition?: TransitionModel;
    };
}
