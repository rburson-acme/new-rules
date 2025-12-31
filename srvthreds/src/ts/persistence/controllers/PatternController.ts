import { PatternModel } from '../../thredlib/index.js';
import { Types } from '../../thredlib/persistence/types.js';
import { Persistence } from '../Persistence.js';

/**
 * Handles all pattern-related persistence operations
 * Single responsibility: Pattern persistence
 */
export class PatternController {
  constructor(private persistence: Persistence) {}

  /**
   * Get all active patterns
   */
  async getAllActivePatterns(): Promise<PatternModel[] | null> {
    return this.persistence.get({
      type: Types.PatternModel,
      matcher: { meta: { active: true } },
    });
  }

  /**
   * Replace a pattern (upsert)
   */
  async replacePattern(pattern: PatternModel): Promise<string | string[] | void> {
    return this.persistence.replace({
      type: Types.PatternModel,
      matcher: { id: pattern.id },
      values: pattern,
    });
  }

  /**
   * Get a specific active pattern by ID
   */
  async getActivePattern(patternId: string): Promise<PatternModel | null> {
    return this.persistence.getOne({
      type: Types.PatternModel,
      matcher: { id: patternId, meta: { active: true } },
    });
  }
}
