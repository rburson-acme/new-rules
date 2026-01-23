export type TransitionInput = 'forward' | 'default' | 'local';
/**
 * A model for defining state (Reaction) transitions
 */
export interface TransitionModel {
    name: string;
    /**
     * A description of the transition.
     */
    description?: string;
    /**
     * Specifies how the transition should supply the input to the next state (Reaction).
     * - 'default' - wait for input from the next matching inbound Event
     * - 'forward' - use the Event that triggered the current (this) Reaction and apply immediately
     * - 'local' - use a locally stored value and apply immediately
     */
    input?: TransitionInput;
    /**
     * The name of the locally stored value to be used as input to the next state (Reaction) if input is 'local'.
     */
    localName?: string;
}
