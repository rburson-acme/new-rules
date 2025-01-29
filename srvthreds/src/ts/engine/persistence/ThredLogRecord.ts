import { Persistent } from "../../thredlib";

export const MATCH = 'm';
export const NO_MATCH = 'nm';
export const NO_THRED = 'nt';
export const NO_PATTERN_MATCH = 'npm';
export interface ThredLogRecord extends Persistent {
    eventId: string;
    thredId?: string;
    type: 'm' | 'nm' | 'nt' | 'npm';
    timestamp?: number;
    fromReaction?: string;
    toReaction?: string;
}