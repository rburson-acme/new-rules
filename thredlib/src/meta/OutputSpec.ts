import { PropertySpec } from './PropertySpec.js';
import { TargetTypeRef } from './TargetTypeSpec.js';

export interface OutputSpec {
  eventType: string;
  // what does this output represent?
  description?: string;
  // right now only values is supported
  eventContentType?: 'values';
  eventContentSpecs?: ContentSpec[];
}

export type ContentSpec = ValuesSpec;

export interface ValuesSpec {
  // represents the 'valuesType' and the values portion of the event payload
  targetTypeName: string; // corresponds to a TargetTypeSpec name
}
