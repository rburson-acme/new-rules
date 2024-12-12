import { ConditionModel } from './ConditionModel.js';
import { FilterModel } from './FilterModel.js';
import { PermissionModel } from './PermissionModel.js';
import { TransitionModel } from './TransitionModel.js';
export interface ReactionModel {
    readonly name?: string;
    readonly description?: string;
    readonly condition: ConditionModel | FilterModel;
    readonly permissions?: PermissionModel;
    readonly expiry?: {
        interval: number;
        transition?: TransitionModel;
    };
}
