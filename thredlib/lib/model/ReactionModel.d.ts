import { ConditionModel } from './ConditionModel.js';
import { FilterModel } from './FilterModel.js';
import { PermissionModel } from './PermissionModel.js';
import { TransitionModel } from './TransitionModel.js';
export interface ReactionModel {
    /**
     * The optional name of the reaction. This makes it easier to refer to in patterns.
     *  @property {string} [name]
     */
    readonly name?: string;
    /**
     * The optional description of the reaction.
     *  @property {string} [description]
     */
    readonly description?: string;
    /**
     * The condition that must be met for the reaction to be activated.
     *  @property {ConditionModel | FilterModel} condition
     */
    readonly condition: ConditionModel | FilterModel;
    /**
     * The optional list of sources that are allowed to activate the reaction.
     * These can be particpantIds, $groups, or /regex/ patterns.
     * ex:  'source.participant1', '$admins', '/^source\\.trusted.\*$/'
     *  @property {string[] | string} [allowedSources]
     */
    readonly allowedSources?: string[] | string;
    /**
     * The set of permissions required to activate the reaction.
     *  @property {PermissionModel} [permissions]
     */
    readonly permissions?: PermissionModel;
    /**
     * The optional expiration policy of the reaction.
     *  @property {object} [expiry]
     */
    readonly expiry?: {
        /**
         * The interval after which the reaction expires in milliseconds.
         * Upon expiration the Reaction will use the default transition or the one specified in the expiry object.
         *  @property {number} interval
         */
        interval: number;
        /**
         * The optional transition that occurs when the reaction expires.
         *  @property {TransitionModel} [transition]
         */
        transition?: TransitionModel;
    };
}
