import { FilterModel } from './FilterModel.js';
import { PublishModel } from './PublishModel.js';
import { TransformModel } from './TransformModel.js';
import { TransitionModel } from './TransitionModel.js';
import { ConsequentModel } from './ConsequentModel.js';
export interface ConditionModel {
    readonly type: string;
    readonly description?: string;
    readonly operands?: (ConditionModel | FilterModel)[];
    readonly onTrue?: ConsequentModel;
    readonly transform?: TransformModel;
    readonly publish?: PublishModel;
    readonly transition?: TransitionModel;
}
