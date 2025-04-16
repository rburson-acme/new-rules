
/**
 * address to participants or groups from the publish spec
 */
export type AddressModel = string[] | string;
export interface PublishModel {
    /**
     * The address(es) to send the outbound Event to. These may be participants or groups.
     */
    to: AddressModel;
    /**
     * A human-readable description of the publish spec
     */
    description?: string;
}