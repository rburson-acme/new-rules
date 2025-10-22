import { ServiceSpec } from "./ServiceSpec.js";
export interface SystemSpec {
    serviceSpecs: ServiceSpec[];
    addressSpec: AddressSpec;
}
export interface AddressSpec {
    participants: ParticipantSpec[];
    groups?: GroupSpec[];
}
export interface ParticipantSpec {
    id: string;
    name?: string;
    uri?: string;
}
export interface GroupSpec {
    name: string;
    participants: {
        participantId: string;
    }[];
}
