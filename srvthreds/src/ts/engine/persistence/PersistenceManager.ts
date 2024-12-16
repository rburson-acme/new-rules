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

  async getAllPatterns(): Promise<PatternModel[]> {
    return this.persistence.find({ type: Types.PatternModel });
  }


}

export const Types = {
    PatternModel: 'PatternModel',
}
