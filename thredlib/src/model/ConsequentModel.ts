export interface ConsequentModel {
  /**
   * A jsonata expression to be run when a condition is true. This is a 'side effect' of the condition.
   * {@link https://jsonata.org/}
   * @property {string} xpr
   */
  xpr: string;
}
