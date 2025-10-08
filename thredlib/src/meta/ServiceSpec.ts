import { TargetTypeSpec } from "./TargetTypeSpec.js";
import { InputSpec } from "./InputSpec.js";
import { OutputSpec } from "./OutputSpec.js";

export interface ServiceSpec {
  name: string;
  description?: string;
  nodeType: string;
  entitySpecs: TargetTypeSpec[];
  outputSpecs: OutputSpec[];
  inputSpecs?: InputSpec[];
}


/*

What is required to build a pattern based on the service information?
participantIds (service addresses)
groupIds
for matching inbound events:
possible (service output) event types
    (output) values associated with this event type
for tasks:
participantIds (service addresses)
possible ops, possible values for each 'type' (entity)
interaction builder


also:
upload icons
*/