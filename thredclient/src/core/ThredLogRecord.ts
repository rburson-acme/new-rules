import { Persistent } from 'thredlib';

export interface ThredLogRecord extends Persistent {
  eventId: string;
  thredId?: string;
  type: 'm' | 'nm' | 'nt' | 'npm';
  timestamp: number;
  fromReaction?: string;
  toReaction?: string;
}

// TODO: Check with rob and see why these arent being exported from lib properly