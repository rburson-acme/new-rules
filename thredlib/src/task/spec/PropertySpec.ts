/**
 * PropertySpec.ts
 * Specification for properties used in tasks.
 * Each property can have a name, type, and a set of possible values (if constrained).
 */
export interface PropertySpec {
    name: string;
    // The type of the property, which can be a primitive type or a complex type.
    type: 'string' | 'number' | 'boolean' | 'Date' | 'object' | 'any' | 'array';
    // A set of possible values for this property, if the property is not free-form.
    set: { display: string; value: any }[];
    // If the type is 'object', this specifies the type of object.
    objectType?: string;
}