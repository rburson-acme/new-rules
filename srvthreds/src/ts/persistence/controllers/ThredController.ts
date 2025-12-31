import { ThredRecord, Logger } from '../../thredlib/index.js';
import { Types } from '../../thredlib/persistence/types.js';
import { Persistence, Query } from '../Persistence.js';

/**
 * Handles all thred-related persistence operations
 * Single responsibility: Thred persistence
 */
export class ThredController {
  constructor(private persistence: Persistence) {}

  /**
   * Save a thred record
   */
  async saveThredRecord(record: ThredRecord): Promise<void> {
    try {
      await this.persistence.put({
        type: Types.ThredRecord,
        values: record,
      });
    } catch (err) {
      Logger.error(
        Logger.crit(`Error saving thred record for thred: ${record.id} pattern: ${record.thred.patternName}`),
        err,
      );
    }
  }

  /**
   * Get threds matching a query
   */
  async getThreds(matcher: Query['matcher']): Promise<ThredRecord[] | null> {
    return this.persistence.get({
      type: Types.ThredRecord,
      matcher,
    });
  }

  /**
   * Get a specific thred by ID
   */
  async getThred(thredId: string): Promise<ThredRecord | null> {
    return this.persistence.getOne({
      type: Types.ThredRecord,
      matcher: { id: thredId },
    });
  }
}
