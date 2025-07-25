import { Operation } from "../Operations.js";
import { PropertySpec } from "./PropertySpec.js";

export interface TaskSpec {
   // type represents the target object or function
   // e.g. an Entity for a db or REST API, or a function name if applicable
   type: string;
   // which operations are supported by this type
   // e.g. 'put', 'get', 'update', etc. These may correspond to db operations or REST calls or simply modifying system parameters
   allowedOps: Operation[];
   // the properties available as input for this task
   inputProperties?: PropertySpec[];
   // the properties available as output for this task
   outputProperties?: PropertySpec[];
}