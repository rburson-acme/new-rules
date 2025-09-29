import { InputSpec } from "./InputSpec.js";
import { OutputSpec } from "./OutputSpec.js";
export interface ServiceSpec {
    name: string;
    address: string;
    description?: string;
    nodeType: string;
    outputSpecs: OutputSpec[];
    inputSpecs?: InputSpec[];
}
