import { EventData } from '../core/Event.js';

/**
 * Describes how a new, outbound Event should be constructed.
 */
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
   *  This is a template that will be supplied to the outbound event and use the EventData structure defined in Event.ts
   *  @property {EventData} [eventDataTemplate]
   */
  readonly eventDataTemplate?: EventData;

  /**
   * An optional jsonata expression to be run to generate the entire Event Data portion of the outbound event.
   */
  readonly templateXpr?: string;
}
