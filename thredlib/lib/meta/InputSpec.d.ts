import { Operation } from "../task/Operations.js";
import { PropertySpec } from "./PropertySpec.js";
export interface InputSpec {
    inputContentType?: 'tasks';
    inputContentSpec?: InputTaskSpec | InputTaskSpec[];
}
export interface InputTaskSpec {
    description?: string;
    targetTypeName: string;
    allowedOps: Operation[];
    options?: PropertySpec[];
}
