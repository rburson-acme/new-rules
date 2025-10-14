export interface OutputSpec {
    eventType: string;
    description?: string;
    eventContentType?: 'values';
    eventContentSpecs?: ContentSpec[];
}
export type ContentSpec = ValuesSpec;
export interface ValuesSpec {
    targetTypeName: string;
}
