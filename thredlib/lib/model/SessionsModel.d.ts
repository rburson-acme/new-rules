import { GroupModel } from './GroupModel.js';
/**
 * Configuration model for sessions
 */
export interface SessionsModel {
    /**
     * Allows for the definition of named groups of participants that may be used in addressing
     */
    groups: GroupModel[];
}
