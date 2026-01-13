/**
 * PropertySpec.ts
 * Specification for properties used in tasks.
 * Each property can have a name, type, and a set of possible values (if constrained).
 * The property may also be know as a 'key', 'field', or a 'column'
 */
export interface PropertySpec {
    /** The name of the property */
    name: string;
    /** What does this property represent? How might it be used or interpreted? */
    description: string;
    /** The type of the property, which can be a primitive type or a complex type. Complex type is represented by 'object' or 'array'. */
    type: 'string' | 'number' | 'boolean' | 'Date' | 'object' | 'array';
    /** A set of possible values for this property, if the property is not constrained. */
    set?: { display: string; value: any }[];
    /** For complex types, define the structure of the object or array elements. */
    propertySpec?: PropertySpec[];
    /** Is this property read-only? */
    readonly?: boolean;
}