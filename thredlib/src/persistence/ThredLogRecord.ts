import { Persistent } from './Persistent.js';

export interface ThredLogRecord extends Persistent {
  eventId: string;
  thredId?: string;
  type: ThredLogRecordType;
  timestamp: number;
  // the starting reaction when processing the event (i.e starting state)
  fromReaction?: string;
  // the reaction that was transitioned to, if any (i.e. ending state)
  toReaction?: string;
}

export enum ThredLogRecordType {
  // the associated event successfully matched a condition
  MATCH = 'm',
  // the associated event did not match any condition
  NO_MATCH = 'nm',
  // the associated event targeted a thred that does not or no longer exists
  NO_THRED = 'nt',
  // the associated event did not match any pattern (no thred)
  NO_PATTERN_MATCH = 'np',
}
