/**
 * PropertySpec.ts
 * Specification for properties used in tasks.
 * Each property can have a name, type, and a set of possible values (if constrained).
 */
export interface PropertySpec {
    name: string;
    // what does this property represent?
    description: string;
    // The type of the property, which can be a primitive type or a complex type.
    type: 'string' | 'number' | 'boolean' | 'Date' | 'object' | 'array';
    // A set of possible values for this property, if the property is not free-form.
    set: { display: string; value: any }[];
    // For complex types, define the structure of the object or array elements.
    propertySpec?: PropertySpec[];
}