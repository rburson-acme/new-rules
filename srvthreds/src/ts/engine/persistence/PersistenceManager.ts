import { Persistence } from "../../persistence/Persistence";
import { PersistenceFactory } from "../../persistence/PersistenceFactory";
import { PatternModel } from "../../thredlib";

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
    return this.persistence.connect();
  }

  async disconnect() {
    return this.persistence.disconnect();
  }

  async getAllPatterns(): Promise<PatternModel[]> {
    return this.persistence.find({ type: Types.PatternModel });
  }

  async upsertPattern(pattern: PatternModel): Promise<void> {
    return this.persistence.upsert({ type: Types.PatternModel, matcher: { id: pattern.id }, values: pattern });
  }


}

export const Types = {
    PatternModel: 'PatternModel',
}
