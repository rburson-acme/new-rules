import { PropertySpec } from "./PropertySpec.js";
export interface TargetTypeSpec {
    type: string;
    description?: string;
    propertySpecs: PropertySpec[];
}
export interface TargetTypeRef {
    targetTypeName: string;
    propertyName: string;
}
