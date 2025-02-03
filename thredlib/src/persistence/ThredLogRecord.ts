import { Persistent } from "./Persistent.js";

// the associated event successfully matched a condition
export const MATCH = 'm';
// the associated event did not match any condition
export const NO_MATCH = 'nm';
// the associated event targeted a thred that does not or no longer exists
export const NO_THRED = 'nt';
// the associated event did not match any pattern (no thred)
export const NO_PATTERN_MATCH = 'npm';
export interface ThredLogRecord extends Persistent {
    eventId: string;
    thredId?: string;
    type: 'm' | 'nm' | 'nt' | 'npm';
    timestamp: number;
    // the starting reaction when processing the event (i.e starting state)
    fromReaction?: string;
    // the reaction that was transitioned to, if any (i.e. ending state)
    toReaction?: string;
}