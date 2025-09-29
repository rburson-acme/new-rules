import { PropertySpec } from './PropertySpec.js';

export interface OutputSpec {
  eventType: string;
  // what does this output represent?
  description?: string;
  // right now only values is supported
  eventContentType?: 'values';
  eventContentSpec?: ContentSpec;
}

export type ContentSpec = ValuesSpec;

export interface ValuesSpec {
  valuesType?: string; // optional application level type of the values
  // this corresponds to the 'values' field in EventValues,
  // which can be a single object or an array of objects
  valuesSpec?: PropertySpec | PropertySpec[];
}
