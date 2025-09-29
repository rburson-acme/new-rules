import { Operation } from "../task/Operations.js";
import { PropertySpec } from "./PropertySpec.js";


export interface InputSpec {
   // right now only tasks is supported
   inputContentType?: 'tasks';
   inputContentSpec?: InputTaskSpec | InputTaskSpec[];
}

export interface InputTaskSpec {
   // what does this task do?
   description?: string;
   // type represents the target object or function
   // e.g. an Entity for a db or REST API, or a function name if applicable
   type: string;
   // which operations are supported by this type
   // e.g. 'put', 'get', 'update', etc. These may correspond to db operations or REST calls or simply modifying system parameters
   allowedOps: Operation[];
   // the properties available on this type
   properties?: PropertySpec[];
   // supported options
   options?: PropertySpec[];
}