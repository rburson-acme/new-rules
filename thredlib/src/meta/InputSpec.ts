import { Operation } from "../task/Operations.js";
import { PropertySpec } from "./PropertySpec.js";
import { TargetTypeRef } from "./TargetTypeSpec.js";


export interface InputSpec {
   // right now only tasks is supported
   inputContentType?: 'tasks';
   inputContentSpec?: InputTaskSpec | InputTaskSpec[];
}

export interface InputTaskSpec {
   // what does this task do?
   description?: string;
   // type represents the target object or function (defined in TargetTypeSpec)
   // e.g. an Entity for a db or REST API, or a function name if applicable
   targetTypeName: string;
   // e.g. 'put', 'get', 'update', etc. These may correspond to db operations or REST calls or simply modifying system parameters
   allowedOps: Operation[];
   // supported options
   options?: PropertySpec[];
}