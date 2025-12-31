import { EventRecord, Logger, ThredLogRecord } from '../../thredlib/index.js';
import { Types } from '../../thredlib/persistence/types.js';
import { Persistence } from '../Persistence.js';

/**
 * Handles all event-related persistence operations
 * Single responsibility: Event persistence
 */
export class EventController {
  constructor(private persistence: Persistence) {}

  /**
   * Replace an event record (upsert)
   */
  async replaceEvent(record: EventRecord): Promise<void> {
    try {
      record.id = record.event.id;
      record.thredId = record.event.thredId;
      await this.persistence.replace({
        type: Types.EventRecord,
        values: record,
        matcher: { id: record.id },
      });
    } catch (err) {
      Logger.error(Logger.crit(`Error saving event record: ${record.id} for thred: ${record.thredId}`), err);
    }
  }

  /**
   * Upsert event with error information
   */
  async upsertEventWithError(record: EventRecord): Promise<void> {
    try {
      record.id = record.event.id;
      const exists = await this.persistence.count({
        type: Types.EventRecord,
        matcher: { id: record.id },
      });

      if (exists) {
        await this.persistence.update({
          type: Types.EventRecord,
          values: { error: record.error },
          matcher: { id: record.id },
        });
      } else {
        await this.persistence.put({
          type: Types.EventRecord,
          values: record,
        });
      }
    } catch (err) {
      Logger.error(Logger.crit(`Error updating event record: ${record.id} for thred: ${record.thredId}`), err);
    }
  }

  /**
   * Add error to an existing event
   */
  async addErrorToEvent(id: string, error: any): Promise<void> {
    try {
      await this.persistence.update({
        type: Types.EventRecord,
        values: { error },
        matcher: { id },
      });
    } catch (err) {
      Logger.error(Logger.crit(`Error updating error field for event: ${error.id}`), err);
    }
  }

  /**
   * Get all events for a thred
   */
  async getEventsForThred(thredId: string): Promise<EventRecord[] | null> {
    return this.persistence.get({
      type: Types.EventRecord,
      matcher: { thredId },
    });
  }

  /**
   * Get events for a thred after a specific timestamp
   */
  async getEventsForThredAfter(thredId: string, timestamp: number): Promise<EventRecord[] | null> {
    return this.persistence.get({
      type: Types.EventRecord,
      matcher: { thredId, timestamp: { $gt: timestamp } },
    });
  }

  /**
   * Get events for a specific participant in a thred
   */
  async getEventsForParticipant(participantId: string, thredId: string): Promise<EventRecord[] | null> {
    return this.persistence.get({
      type: Types.EventRecord,
      matcher: { thredId, $or: [{ to: { $in: [participantId] } }, { 'event.source.id': participantId }] },
      collector: { sort: [{ field: 'timestamp' }] },
    });
  }

  /**
   * Get the last event for a participant in a thred
   */
  async getLastEventForParticipant(participantId: string, thredId: string): Promise<EventRecord | null> {
    const events = await this.persistence.get<EventRecord>({
      type: Types.EventRecord,
      matcher: { thredId, $or: [{ to: { $in: [participantId] } }, { 'event.source.id': participantId }] },
      collector: { sort: [{ field: 'timestamp', desc: true }], limit: 1 },
    });
    return events?.[0] || null;
  }

  /**
   * Save a thred log record
   */
  async saveThredLogRecord(record: ThredLogRecord): Promise<void> {
    try {
      await this.persistence.put({
        type: Types.ThredLogRecord,
        values: record,
      });
    } catch (err) {
      Logger.error(Logger.crit(`Error saving thred log record: ${record.type} for thred: ${record.thredId}`), err);
    }
  }

  /**
   * Get thred log records
   */
  async getThredLogRecords(thredId: string): Promise<ThredLogRecord[] | null> {
    return this.persistence.get({
      type: Types.ThredLogRecord,
      matcher: { thredId },
      collector: { sort: [{ field: 'timestamp' }] },
    });
  }
}
