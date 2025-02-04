
/**
 * Include and/or exclude participants or groups from the publish spec
 */
export type AddressModel = { include: string[], exclude?: string[] };
export interface PublishModel {
    /**
     * The address(es) to send the outbound Event to. These may be participants or groups.
     * May be a single string, an array of strings, or an object with include/exclude arrays
     */
    to: AddressModel | string[] | string;
    /**
     * A human-readable description of the publish spec
     */
    description?: string;
}