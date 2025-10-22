import { TargetTypeSpec } from "./TargetTypeSpec.js";
import { InputSpec } from "./InputSpec.js";
import { OutputSpec } from "./OutputSpec.js";

export interface ServiceSpec {
  name: string;
  description?: string;
  // node type and address are pulled from the resolver config
  // and node type is used for address unless it's defined in the service spec itself as an override
  nodeType: string;
  // servicespec can override address here
  address: string;
  entitySpecs: TargetTypeSpec[];
  outputSpecs: OutputSpec[];
  inputSpecs?: InputSpec[];
}