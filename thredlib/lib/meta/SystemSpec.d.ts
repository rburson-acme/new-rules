import { ServiceSpec } from "./ServiceSpec.js";
/**
 * Specification for a distributed system, including services and participant addresses.
 * The system spec provides service input and output information for use in creating Patterns.
 * It defines all available services, their input event formats, and their output event formats.
 */
export interface SystemSpec {
    /**
     * Specifications for services available in the distributed system.
     */
    serviceSpecs: ServiceSpec[];
    /**
     * Specifications for participant addresses and groups within the distributed system.
     */
    addressSpec: AddressSpec;
}
/**
 * Specification for participant addresses and groups within the distributed system.
 */
export interface AddressSpec {
    /**
     * Specifications for individual participants in the distributed system.
     */
    participants: ParticipantSpec[];
    /**
     * Specifications for groups of participants in the distributed system.
     */
    groups?: GroupSpec[];
}
/**
 * Specification for a participant's address within the distributed system.
 */
export interface ParticipantSpec {
    /**
     * Unique identifier for the participant.
     */
    id: string;
    /**
     * Optional human-readable name for the participant.
     */
    name?: string;
    /**
     * Optional URI representation of the participant.
     */
    uri?: string;
}
/**
 * Specification for a addressing group of participants within the distributed system.
 */
export interface GroupSpec {
    /**
     * Name of the participant group to be used in addressing (i.e. $groupName)
     */
    name: string;
    /**
     * List of participants included in the group.
     */
    participants: {
        participantId: string;
    }[];
}
