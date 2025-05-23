import { Persistent } from './Persistent.js';
export interface ThredLogRecord extends Persistent {
    eventId: string;
    thredId?: string;
    type: ThredLogRecordType;
    timestamp: number;
    fromReaction?: string;
    toReaction?: string;
}
export declare enum ThredLogRecordType {
    MATCH = "m",
    NO_MATCH = "nm",
    NO_THRED = "nt",
    NO_PATTERN_MATCH = "np"
}
