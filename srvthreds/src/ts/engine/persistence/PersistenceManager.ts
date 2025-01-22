import { Persistence } from '../../persistence/Persistence';
import { PersistenceFactory } from '../../persistence/PersistenceFactory';
import { PatternModel } from '../../thredlib';

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
}

export const Types = {
  PatternModel: 'PatternModel',
};
