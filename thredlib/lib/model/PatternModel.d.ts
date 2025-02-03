import { Persistent } from '../persistence/Persistent.js';
import { ReactionModel } from './ReactionModel.js';
export interface PatternModel extends Persistent {
    /**
     * A unique identifier for the pattern. This will be derived from the name if not provided.
     * @property {string} id
     */
    id?: string;
    /**
     * A unique name for the pattern
     * @property {string} name
     */
    name: string;
    /**
     * A description of the pattern
     * @property {string} description
     */
    description?: string;
    /**
     * The time required between creation of new threads 0 for none required
     * @property {number} instanceInterval
     */
    instanceInterval?: number;
    /**
     * The maximum number of thred instances that may be running at the same time
     * @property {number} maxInstances
     */
    maxInstances?: number;
    /**
     * Reactions represent thred states
     * @property {ReactionModel[]} reactions
     */
    reactions: ReactionModel[];
}
