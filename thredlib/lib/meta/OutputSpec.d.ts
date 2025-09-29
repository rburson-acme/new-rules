import { PropertySpec } from './PropertySpec.js';
export interface OutputSpec {
    eventType: string;
    description?: string;
    eventContentType?: 'values';
    eventContentSpec?: ContentSpec;
}
export type ContentSpec = ValuesSpec;
export interface ValuesSpec {
    valuesType?: string;
    valuesSpec?: PropertySpec | PropertySpec[];
}
