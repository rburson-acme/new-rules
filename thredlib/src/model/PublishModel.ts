import { ConsequentModel } from './ConsequentModel.js';

/**
 * address to participants or groups from the publish spec
 */
export type AddressModel = string[] | string;
export interface PublishModel {

  /**
   * The optional name of the transform. May be used to reference this transform elsewhere.
   * The transform name may be used with the $isResponseFor() function in jsonata expressions to test whether 
   * an inbound event is a response to an outbound event generated using this transform (by checking the 're' property under the hood).
   * @property {string} [name]
   */
  readonly name?: string;

  /**
   * The address(es) to send the outbound Event to. These may be participants or groups ($groupName).
   */
  readonly to: AddressModel;
  /**
   * A human-readable description
   */
  readonly description?: string;
  /**
   * An expression to be run at publish time with the new, outbound Event available in the expression as $outboundEvent
   * The inbound Event is available as $event as are the rest of the accessor and function bindings.
   *  @property {ConsequentModel} [
   */
  readonly onPublish?: ConsequentModel;
}
