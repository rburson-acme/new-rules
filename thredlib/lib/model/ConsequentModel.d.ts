export interface ConsequentModel {
    /**
     * A jsonata expression to be run when a condition is true. This is a 'side effect' of the condition.
     * Generally used to store values in scope for later use
     * {@link https://jsonata.org/}
     * @property {string} xpr
     */
    xpr: string;
}
