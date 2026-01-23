import { FilterModel } from './FilterModel.js';
import { PublishModel } from './PublishModel.js';
import { TransformModel } from './TransformModel.js';
import { TransitionModel } from './TransitionModel.js';
import { ConsequentModel } from './ConsequentModel.js';

/** Defines a condition (true or false) that can be composed of other conditions or filters */
export interface ConditionModel {
  /**
   * The type of the condition. May be 'and', 'or', or 'filter'.
   *  @property {string} type
   */
  readonly type: 'and' | 'or' | 'filter';

  /**
   * A description of the condition.
   *  @property {string} [description]
   */
  readonly description?: string;

  /**
   * The composite conditions to be used for And/Or conditions if type is 'and' or 'or'.
   *  @property {(ConditionModel | FilterModel)[]} [operands]
   */
  readonly operands?: (ConditionModel | FilterModel)[];

  /**
   * A expression to be run as a side-effect if the condition is true.
   *  @property {ConsequentModel} [
   */
  readonly onTrue?: ConsequentModel;

  /**
   * The transform to be applied if the condition is true. Describes 'what' should be sent in the new, outbound Event.
   */
  readonly transform?: TransformModel;

  /**
   * Specifies which participants should receive the the new, outbound Event if the condition is true.
   * Describes 'who' should receive the new, outbound Event.
   * @property {PublishModel} [publish]
   */
  readonly publish?: PublishModel;

  /**
   * The state (Reaction) transition that should occur if the condition is true.
   * The default (if not specified) is to transition to the next Reaction (or terminate if none).
   */
  readonly transition?: TransitionModel;
}
