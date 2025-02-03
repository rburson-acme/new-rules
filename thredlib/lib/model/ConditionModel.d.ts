import { FilterModel } from './FilterModel.js';
import { PublishModel } from './PublishModel.js';
import { TransformModel } from './TransformModel.js';
import { TransitionModel } from './TransitionModel.js';
import { ConsequentModel } from './ConsequentModel.js';
export interface ConditionModel {
    /**
     * The type of the condition.
     *  @property {string} type
     */
    readonly type: string;
    /**
     * A description of the condition.
     *  @property {string} [description]
     */
    readonly description?: string;
    /**
     * The composite conditions to be used for And/Or conditions.
     *  @property {(ConditionModel | FilterModel)[]} [operands]
     */
    readonly operands?: (ConditionModel | FilterModel)[];
    /**
     * A handler to be run if the condition is true.a
     *  @property {ConsequentModel} [
     */
    readonly onTrue?: ConsequentModel;
    /**
     * The transform to be applied if the condition is true. Describes 'what' should be sent in the new Event.
     */
    readonly transform?: TransformModel;
    /**
     * Specifies which participants should receive the the new Event if the condition is true.
     * Describes 'who' should receive the new Event.
     * @property {PublishModel} [publish]
     */
    readonly publish?: PublishModel;
    /**
     * The state (Reaction) transition that should occur if the condition is true.
     */
    readonly transition?: TransitionModel;
}
