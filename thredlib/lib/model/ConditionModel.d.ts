import { FilterModel } from './FilterModel.js';
import { PublishModel } from './PublishModel.js';
import { TransformModel } from './TransformModel.js';
import { TransitionModel, TransitionInput } from './TransitionModel.js';
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
    /**
     * An optional SpawnModel that specifies child or sibling Threds to spawn when the condition is true.
     * Spawn is a peer directive to transform, publish, and transition.
     */
    readonly spawn?: SpawnModel;
}
export interface SpawnModel {
    /**
     * The name(s) of the Pattern(s) to spawn as new Thred(s) when the condition is true.
     * @property {string[]} names
     */
    names: string[];
    /**
     * TransitionInput used to specify what input the spawned Thred(s) should receive.
     * 'default' will simply have the thred wait for the next event, 'forward' would pass the current event
     * as input to the spawned Thred(s), while 'local' would pass the value of localName from local state as
     * input to the spawned Thred(s).
     * @property {TransitionInput} input
     */
    input: TransitionInput;
    /**
     * The type of thred to spawn. Can be 'child' or 'sibling'.
     * Child threds are spawned as children of the current thred,
     * and will be automatically terminated when the parent thred terminates.
     * Sibling threds are spawned at the same level as the current thred, and will not be automatically terminated
     * when the parent thred terminates.
     * @property {'child' | 'sibling'} type
     */
    type: 'child' | 'sibling';
    /**
     * The name of the locally stored value to be used as input to the spawned Thred(s) if input is 'local'.
     * @property {string} localName
     */
    localName?: string;
    /**
     * When true, the parent Thred's ThredContext (scope and participants) is deep copied to the spawned Thred(s).
     * @property {boolean} context
     */
    context?: boolean;
}
