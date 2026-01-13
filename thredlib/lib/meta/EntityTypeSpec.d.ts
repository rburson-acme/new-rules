import { PropertySpec } from "./PropertySpec.js";
/**
 * Specification for a entity type used in services.
 * The entity spec represents the structure of a service input or output.
 */
export interface EntityTypeSpec {
    /** Represents the name of the entity type or the name of a function */
    type: string;
    /**
     * Optional description of the entity type or function.
     */
    description?: string;
    /**
     * A list of the properties that define the structure of the entity type or the parameters of the function.
     */
    propertySpecs: PropertySpec[];
}
