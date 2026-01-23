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
     * This is a way to throttle new instance creation
     * @property {number} instanceInterval
     */
    instanceInterval?: number;
    /**
     * The maximum number of thred instances that may be running at the same time
     * @property {number} maxInstances
     */
    maxInstances?: number;
    /**
     * Whether or not broadcasting from participants is allowed
     * Broadcasting allows for sending a message to all other participants in the thred
     * @property {boolean} broadcastAllowed
     */
    broadcastAllowed?: boolean;
    /**
     * Whether or not participants responses are echoed to the Thred,
     * meaning they are seen by other participants
     * @property {boolean} echoResponses
     */
    echoResponses?: boolean;
    /**
     * Whether or not unbound events are matched against an already running thred
     * The allows for event to be sent that do not have a thredId but signifcantly
     * increases processing requirements.
     */
    allowUnbound?: boolean;
    /**
     * Reactions represent thred states
     * @property {ReactionModel[]} reactions
     */
    reactions: ReactionModel[];
}
