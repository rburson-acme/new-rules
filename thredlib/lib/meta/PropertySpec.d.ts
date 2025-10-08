/**
 * PropertySpec.ts
 * Specification for properties used in tasks.
 * Each property can have a name, type, and a set of possible values (if constrained).
 */
export interface PropertySpec {
    name: string;
    description: string;
    type: 'string' | 'number' | 'boolean' | 'Date' | 'object' | 'array';
    set: {
        display: string;
        value: any;
    }[];
    propertySpec?: PropertySpec[];
}
