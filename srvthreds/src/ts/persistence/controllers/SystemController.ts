import { ConfigLoader } from '../../config/ConfigLoader.js';
import { EventRecord, PatternModel, ThredLogRecord, ThredRecord } from '../../thredlib/index.js';
import { Types } from '../../thredlib/persistence/types.js';
import { Persistence, Query } from '../Persistence.js';
import { PersistenceFactory } from '../PersistenceFactory.js';
import { EventController } from './EventController.js';
import { PatternController } from './PatternController.js';
import { ThredController } from './ThredController.js';

/**
 * Facade for system persistence operations
 * Delegates to specialized controller classes
 */
export class SystemController {
  private static instance: SystemController;
  private persistence: Persistence;
  private eventController: EventController;
  private patternController: PatternController;
  private thredController: ThredController;

  private constructor() {
    this.persistence = PersistenceFactory.getPersistence();
    this.eventController = new EventController(this.persistence);
    this.patternController = new PatternController(this.persistence);
    this.thredController = new ThredController(this.persistence);
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
   * Event Operations
   * Delegated to EventController
   ***************************************************** */
  async replaceEvent(record: EventRecord): Promise<void> {
    return this.eventController.replaceEvent(record);
  }

  async upsertEventWithError(record: EventRecord): Promise<void> {
    return this.eventController.upsertEventWithError(record);
  }

  async addErrorToEvent(id: string, error: any): Promise<void> {
    return this.eventController.addErrorToEvent(id, error);
  }

  async saveThredLogRecord(record: ThredLogRecord): Promise<void> {
    return this.eventController.saveThredLogRecord(record);
  }

  /*****************************************************
   * Pattern Operations
   * Delegated to PatternController
   ***************************************************** */
  async getAllActivePatterns(): Promise<PatternModel[] | null> {
    return this.patternController.getAllActivePatterns();
  }

  async replacePattern(pattern: PatternModel): Promise<string | string[] | void> {
    return this.patternController.replacePattern(pattern);
  }

  async getActivePattern(patternId: string): Promise<PatternModel | null> {
    return this.patternController.getActivePattern(patternId);
  }

  /*****************************************************
   * Event Query Operations
   * Delegated to EventController
   ***************************************************** */
  async getEventsForThred(thredId: string): Promise<EventRecord[] | null> {
    return this.eventController.getEventsForThred(thredId);
  }

  async getEventsForThredAfter(thredId: string, timestamp: number): Promise<EventRecord[] | null> {
    return this.eventController.getEventsForThredAfter(thredId, timestamp);
  }

  async getEventsForParticipant(participantId: string, thredId: string): Promise<EventRecord[] | null> {
    return this.eventController.getEventsForParticipant(participantId, thredId);
  }

  async getLastEventForParticipant(participantId: string, thredId: string): Promise<EventRecord | null> {
    return this.eventController.getLastEventForParticipant(participantId, thredId);
  }

  /**
   * For a given participant, gets the last event for each of the specified threds.
   *
   * @param threadIds The IDs of the threds to search.
   * @param participantId The ID of the participant.
   * @returns A Promise that resolves to a Map where the key is the thredId and the value is the last EventRecord or undefined if no event was found for that thred.
   */
  /*  async getLastEventForEachThreadForParticipant(
    threadIds: string[],
    participantId: string,
  ): Promise<Map<string, EventRecord | undefined>> {

    @TODO: Implement after adding aggregation support to persistence layer
  }*/

  async getThredLogRecords(thredId: string): Promise<ThredLogRecord[] | null> {
    return this.eventController.getThredLogRecords(thredId);
  }

  /*****************************************************
   * Thred Operations
   * Delegated to ThredController
   ***************************************************** */
  async saveThredRecord(record: ThredRecord): Promise<void> {
    return this.thredController.saveThredRecord(record);
  }

  async getThreds(matcher: Query['matcher']): Promise<ThredRecord[] | null> {
    return this.thredController.getThreds(matcher);
  }

  async getThred(thredId: string): Promise<ThredRecord | null> {
    return this.thredController.getThred(thredId);
  }

  /*****************************************************
   * Config Operations
   * Remain in SystemController
   ***************************************************** */
  async upsertConfig(configName: string, config: any): Promise<void> {
    await this.persistence.upsert({ type: Types.Config, matcher: { id: configName }, values: { config } });
  }

  async getConfig(configName: string): Promise<any | null> {
    const entry = await this.persistence.getOne({ type: Types.Config, matcher: { id: configName } });
    return entry ? entry.config : null;
  }
}
