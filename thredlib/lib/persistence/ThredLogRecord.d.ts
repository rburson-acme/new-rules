import { Persistent } from "./Persistent.js";
export declare const MATCH = "m";
export declare const NO_MATCH = "nm";
export declare const NO_THRED = "nt";
export declare const NO_PATTERN_MATCH = "npm";
export interface ThredLogRecord extends Persistent {
    eventId: string;
    thredId?: string;
    type: 'm' | 'nm' | 'nt' | 'npm';
    timestamp: number;
    fromReaction?: string;
    toReaction?: string;
}
