import { Operation } from "../Operations.js";
import { PropertySpec } from "./PropertySpec.js";
export interface TaskSpec {
    type: string;
    allowedOps: Operation[];
    inputProperties?: PropertySpec[];
    outputProperties?: PropertySpec[];
}
