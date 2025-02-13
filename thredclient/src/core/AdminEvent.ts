import { EventRecord, ThredLogRecord } from 'thredlib';

export interface AdminEvent extends EventRecord {
  thredLogs: ThredLogRecord[];
}
