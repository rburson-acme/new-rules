import { ConsequentModel } from './ConsequentModel.js';

/**
 * address to participants or groups from the publish spec
 */
export type AddressModel = string[] | string;
export interface PublishModel {
  /**
   * The address(es) to send the outbound Event to. These may be participants or groups ($groupName).
   */
  readonly to: AddressModel;
  /**
   * A human-readable description
   */
  readonly description?: string;
  /**
   * An expression to be run at publish time with the new, outbound Event as the event paramater.
   *  @property {ConsequentModel} [
   */
  readonly onPublish?: ConsequentModel;
}
