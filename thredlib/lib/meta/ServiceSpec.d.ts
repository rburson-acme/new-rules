import { EntityTypeSpec } from "./EntityTypeSpec.js";
import { InputSpec } from "./InputSpec.js";
import { OutputSpec } from "./OutputSpec.js";
export interface ServiceSpec {
    /**
     * The name of the service.
     */
    name: string;
    /**
     * Optional description of the service.
     */
    description?: string;
    /**
     * The node type of the service.
     * Node type and address are pulled from the resolver config.
     * Node type is used for address unless it's defined in the service spec itself as an override.
     */
    nodeType: string;
    /**
     * The address of the service (dafaults to the address of the node type in the resolver config)
     * ServiceSpec can override address here.
     */
    address: string;
    /**
     * Specifications for the input and output entities used by the service.
     */
    entitySpecs: EntityTypeSpec[];
    /**
     * Maps service output to entity specs
     */
    outputSpecs: OutputSpec[];
    /**
     * Maps service input to entity specs
     */
    inputSpecs?: InputSpec[];
}
