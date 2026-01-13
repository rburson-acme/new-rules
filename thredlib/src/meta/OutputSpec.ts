export interface OutputSpec {
  /**
   * The type of event output by the service.
   */
  eventType: string;
  /**
   * What does this output represent?
   */
  description?: string;
  /**
   * Currently only 'values' output format is supported
   * This corresponds to the EventData payload defined by the EventValues interface
   */
  eventContentType?: 'values';
  eventContentSpecs?: ContentSpec[];
}

export type ContentSpec = ValuesSpec;

export interface ValuesSpec {
  /**
   * Defines an output structure that corresponds to an EntiyTypeSpec name.  
   * For specifying the values portion of the event payload as defined by the EventValues interface.
   */
  entityTypeName: string;
}
