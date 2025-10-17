import { TargetTypeSpec } from "./TargetTypeSpec.js";
import { InputSpec } from "./InputSpec.js";
import { OutputSpec } from "./OutputSpec.js";
export interface ServiceSpec {
    name: string;
    description?: string;
    nodeType: string;
    address: string;
    entitySpecs: TargetTypeSpec[];
    outputSpecs: OutputSpec[];
    inputSpecs?: InputSpec[];
}
