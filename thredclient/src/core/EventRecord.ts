import { Address, Event, Persistent } from 'thredlib';
import { ThredLogRecord } from './ThredLogRecord';

export interface EventRecord extends Persistent {
  event: Event;
  timestamp: number;
  thredId?: string;
  error?: any;
  to?: string[] | Address;
  log?: ThredLogRecord;
}
