import { ConditionModel } from './ConditionModel.js';

export interface FilterModel extends ConditionModel {
  /**
   * A jsonata expression that will be evaluated to determine if the filter is true. Describes 'when' and event should be created and sent.
   * {@link https://jsonata.org/}
   * @property {string} xpr
   */
  xpr: string;
}
