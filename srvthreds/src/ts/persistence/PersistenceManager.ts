import { Persistence } from './Persistence.js';
import { PersistenceFactory } from './PersistenceFactory.js';
import { Query } from '../task/Taskable.js';
import {
  PatternModel,
  Logger,
  ThredLogRecord,
  EventRecord,
  ThredRecord,
} from '../thredlib/index.js';

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

  async getAllActivePatterns(): Promise<PatternModel[] | null> {
    return this.persistence.get({ type: Types.PatternModel, matcher: { meta: { active: true } } });
  }

  async upsertPattern(pattern: PatternModel): Promise<string | string[] | void> {
    return this.persistence.upsert({ type: Types.PatternModel, matcher: { id: pattern.id }, values: pattern });
  }

  async getActivePattern(patternId: string): Promise<PatternModel | null> {
    return this.persistence.getOne({ type: Types.PatternModel, matcher: { id: patternId, meta: { active: true } } });
  }

  async saveEvent(record: EventRecord): Promise<void> {
    try {
      record.id = record.event.id;
      record.thredId = record.event.thredId;
      await this.persistence.replace({ type: Types.EventRecord, values: record, matcher: { id: record.id } });
    } catch (err) {
      Logger.error(Logger.crit(`Error saving event record: ${record.id} for thred: ${record.thredId}`), err);
    }
  }

  async getEventsForThred(thredId: string): Promise<EventRecord[] | null> {
    return this.persistence.get({ type: Types.EventRecord, matcher: { thredId } });
  }

  async saveThredLogRecord(record: ThredLogRecord): Promise<void> {
    try {
      await this.persistence.put({ type: Types.ThredLogRecord, values: record });
    } catch (err) {
      Logger.error(Logger.crit(`Error saving thred log record: ${record.type} for thred: ${record.thredId}`), err);
    }
  }

  async getThredLogRecords(thredId: string): Promise<ThredLogRecord[] | null> {
    return this.persistence.get({ type: Types.ThredLogRecord, matcher: { thredId } });
  }

  async saveThredRecord(record: ThredRecord): Promise<void> {
    try {
      await this.persistence.put({ type: Types.ThredRecord, values: record });
    } catch (err) {
      Logger.error(Logger.crit(`Error saving thred record for thred: ${record.id} pattern: ${record.thred.patternName}`), err);
    }
  }
  
  async getThreds(matcher: Query['matcher']): Promise<ThredRecord[] | null> {
    return this.persistence.get({ type: Types.ThredRecord, matcher });
  }

  async getThred(thredId: string): Promise<ThredRecord | null> {
    return this.persistence.getOne({ type: Types.ThredRecord, matcher: { id: thredId } });
  }

  async saveConfig(configName: string, config: any): Promise<void> {
    try {
      await this.persistence.upsert({ type: Types.Config, matcher: { id: configName }, values: { config }});
    } catch (err) {
      Logger.error(Logger.crit(`Error saving config record with id: ${configName}`), err);
    }
  }

  async getConfig(configName: string): Promise<any | null> {
    const configRecord = await this.persistence.get({ type: Types.Config, matcher: { id: configName } });
    if(configRecord?.length) {
      return configRecord[0].config;
    }
  }
}

export const Types = {
  PatternModel: 'PatternModel',
  EventRecord: 'EventRecord',
  ThredLogRecord: 'ThredLogRecord',
  ThredRecord: 'ThredRecord',
  Config: 'Config'
};
