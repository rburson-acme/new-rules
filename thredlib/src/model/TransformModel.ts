import { EventData } from '../core/Event.js';

export interface TransformModel {
  /**
   * Meta data for the transform.
   *  @property {object} [meta]
   */
  readonly meta?: {
    /**
     *  An optional jsonata expression that allows for setting the 're' property of the outbound event.
     *  @property {string} [reXpr]
     */
    reXpr?: string;
  };

  /**
   * An optional description of the transform.
   *  @property {string} [description]
   */
  readonly description?: string;

  /**
   *  Allows for defining The Event Data portion of the outbound event.
   *  @property {EventData} [eventDataTemplate]
   */
  readonly eventDataTemplate?: EventData;

  /**

   */
  readonly templateXpr?: string;
}
