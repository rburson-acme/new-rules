import { Persistence } from '../../persistence/Persistence.js';
import { PersistenceFactory } from '../../persistence/PersistenceFactory.js';
import { PatternModel, Event, errorCodes, errorKeys, Logger } from '../../thredlib';
import { EventThrowable } from '../../thredlib/core/Errors.js';
import { EventRecord } from './EventRecord';
import { ThredLogRecord } from './ThredLogRecord.js';

export class PersistenceManager {
  private static instance: PersistenceManager;
  private persistence: Persistence;
  private constructor() {
    this.persistence = PersistenceFactory.getPersistence();
  }

  static get(): PersistenceManager {
    if (!PersistenceManager.instance) {
      PersistenceManager.instance = new PersistenceManager();
    }
    return PersistenceManager.instance;
  }

  async connect() {
    return PersistenceFactory.connect();
  }

  async disconnect() {
    return PersistenceFactory.disconnectAll();
  }

  async getAllActivePatterns(): Promise<PatternModel[]> {
    return this.persistence.get({ type: Types.PatternModel, matcher: { meta: { active: true } } });
  }

  async upsertPattern(pattern: PatternModel): Promise<void> {
    return this.persistence.upsert({ type: Types.PatternModel, matcher: { id: pattern.id }, values: pattern });
  }

  async getActivePattern(patternId: string): Promise<PatternModel | undefined> {
    return this.persistence.getOne({ type: Types.PatternModel, matcher: { id: patternId, meta: { active: true } } });
  }

  async saveEvent(record: EventRecord): Promise<void> {
    try {
    record.id = record.event.id;
    record.thredId = record.event.thredId;
    await this.persistence.replace({ type: Types.EventRecord, values: record, matcher: { id: record.id } });
    } catch(err) {
      Logger.error(Logger.crit(`Error saving event record: ${record.id} for thred ${record.thredId}`), err);
    }
  }

  async getEventsForThred(thredId: string): Promise<EventRecord[]> {
    return this.persistence.get({ type: Types.EventRecord, matcher: { thredId } });
  }

  async saveThredLogRecord(entry: ThredLogRecord): Promise<void> {
    try {
    const timestamp = Date.now();
    await this.persistence.put({ type: Types.ThredLogEntry, values: { timestamp, ...entry } });
    } catch(err) {
      Logger.error(Logger.crit(`Error saving thred log record: ${entry.type} for thred ${entry.thredId}`), err);
    }
  }

  async getThredLogRecords(thredId: string): Promise<ThredLogRecord[]> {
    return this.persistence.get({ type: Types.ThredLogEntry, matcher: { thredId } });
  }
}

export const Types = {
  PatternModel: 'PatternModel',
  EventRecord: 'EventRecord',
  ThredLogEntry: 'ThredLogEntry',
};
