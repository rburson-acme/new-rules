import { Persistence } from '../Persistence.js';
import { PersistenceFactory } from '../PersistenceFactory.js';
import { Query } from '../../task/Taskable.js';
import { PatternModel, Logger, ThredLogRecord, EventRecord, ThredRecord, Persistent } from '../../thredlib/index.js';
import { User } from '../../thredlib/persistence/User.js';
import { Types } from '../../thredlib/persistence/types.js';

export class SystemController {
  private static instance: SystemController;
  private persistence: Persistence;
  private constructor() {
    this.persistence = PersistenceFactory.getPersistence();
  }

  static get(): SystemController {
    if (!SystemController.instance) {
      SystemController.instance = new SystemController();
    }
    return SystemController.instance;
  }

  async connect() {
    return PersistenceFactory.connect();
  }

  async disconnect() {
    return PersistenceFactory.disconnectAll();
  }

  /***************************************************** 
  * Logging Operations
  * These should fail quietly 
  ***************************************************** */
  async replaceEvent(record: EventRecord): Promise<void> {
    try {
      record.id = record.event.id;
      record.thredId = record.event.thredId;
      await this.persistence.replace({ type: Types.EventRecord, values: record, matcher: { id: record.id } });
    } catch (err) {
      Logger.error(Logger.crit(`Error saving event record: ${record.id} for thred: ${record.thredId}`), err);
    }
  }

  async saveThredLogRecord(record: ThredLogRecord): Promise<void> {
    try {
      await this.persistence.put({ type: Types.ThredLogRecord, values: record });
    } catch (err) {
      Logger.error(Logger.crit(`Error saving thred log record: ${record.type} for thred: ${record.thredId}`), err);
    }
  }

  async saveThredRecord(record: ThredRecord): Promise<void> {
    try {
      await this.persistence.put({ type: Types.ThredRecord, values: record });
    } catch (err) {
      Logger.error(
        Logger.crit(`Error saving thred record for thred: ${record.id} pattern: ${record.thred.patternName}`),
        err,
      );
    }
  }

  /***************************************************** 
  * System Operations
  ***************************************************** */
  async getAllActivePatterns(): Promise<PatternModel[] | null> {
    return this.persistence.get({ type: Types.PatternModel, matcher: { meta: { active: true } } });
  }

  async upsertPattern(pattern: PatternModel): Promise<string | string[] | void> {
    return this.persistence.upsert({ type: Types.PatternModel, matcher: { id: pattern.id }, values: pattern });
  }

  async getActivePattern(patternId: string): Promise<PatternModel | null> {
    return this.persistence.getOne({ type: Types.PatternModel, matcher: { id: patternId, meta: { active: true } } });
  }

  async getEventsForThred(thredId: string): Promise<EventRecord[] | null> {
    return this.persistence.get({ type: Types.EventRecord, matcher: { thredId } });
  }

  async getEventsForParticipant(thredId: string, participantId: string): Promise<EventRecord[] | null> {
    return this.persistence.get({ type: Types.EventRecord, matcher: { thredId, to: { $in: [participantId] } } });
  }


  async getThredLogRecords(thredId: string): Promise<ThredLogRecord[] | null> {
    return this.persistence.get({ type: Types.ThredLogRecord, matcher: { thredId } });
  }


  async getThreds(matcher: Query['matcher']): Promise<ThredRecord[] | null> {
    return this.persistence.get({ type: Types.ThredRecord, matcher });
  }

  async getThred(thredId: string): Promise<ThredRecord | null> {
    return this.persistence.getOne({ type: Types.ThredRecord, matcher: { id: thredId } });
  }

  async upsertConfig(configName: string, config: any): Promise<void> {
    await this.persistence.upsert({ type: Types.Config, matcher: { id: configName }, values: { config } });
  }

  async getConfig(configName: string): Promise<any | null> {
    return this.persistence.getOne({ type: Types.Config, matcher: { id: configName } });
  }
}
