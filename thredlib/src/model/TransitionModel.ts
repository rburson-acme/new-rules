export type TransitionInput = 'forward' | 'default' | 'local';
export interface TransitionModel {
  /*
   * The name of the Reaction to transition to.
   */
  name: string;
  /**
   * A description of the transition.
   */
  description?: string;
  /**
   * Specifies how the transition should supply the input to the next state (Reaction).
   * - 'default' - wait for input from the next matching Event
   * - 'forward' - use the Event that triggered the current (this) Reaction
   * - 'local' - use a locally stored value
   */
  input?: TransitionInput;
  /**
   * The name of the locally stored value to be used as input to the next state (Reaction) if input is 'local'.
   */
  localName?: string;
}
