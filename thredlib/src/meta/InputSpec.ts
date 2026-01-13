import { Operation } from '../task/Operations.js';
import { PropertySpec } from './PropertySpec.js';

/**
 * Specifies a services input format by referencing an entity type and defining allowed operations.
 */
export interface InputSpec {
  /**
   *  Currently only 'tasks' input format is supported
   *  This corresponds to the EventData payload defined by the EventTasks interface
   */
  inputContentType?: 'tasks';
  inputContentSpec?: InputTaskSpec | InputTaskSpec[];
}
export interface InputTaskSpec {
  /** What does this task do? */
  description?: string;
  /**
    * Type refers to an entity or function defined in EntityTypeSpec
    * e.g. an Entity for a db or REST API, or a function name if applicable
   */
  entityTypeName: string;
  /** e.g. 'put', 'get', 'update', etc. These may correspond to db operations or REST calls or simply modifying system parameters */
  allowedOps: Operation[];
  /** supported options */
  options?: PropertySpec[];
}
