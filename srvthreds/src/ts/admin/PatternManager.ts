import { Persistence } from '../persistence/Persistence';
import { PersistenceFactory } from '../persistence/PersistenceFactory';
import { PatternModel, Persistent } from '../thredlib';

export class PatternManager {
  static readonly type = 'PatternModel';
  private static instance: PatternManager;

  static async getInstance(): Promise<PatternManager> {
    if(!PatternManager.instance) {
      const persistence = PersistenceFactory.getPersistence();
      await persistence.connect();
      PatternManager.instance = new PatternManager(persistence);
    }
    return PatternManager.instance;
  }

  constructor(readonly persistence: Persistence) {}

  async savePatternModel(patternModel: PatternModel): Promise<void> {
    if (!patternModel.id) throw Error(`PatternModel has no id`);
    const existingRecord = await this.persistence.findOne({
      type: PatternManager.type,
      matcher: { id: patternModel.id },
    });
    if(existingRecord) {
      return this.persistence.update({
        type: PatternManager.type,
        matcher: { id: patternModel.id },
        values: patternModel,
      });
    }
    return this.persistence.create({
      type: PatternManager.type,
      values: patternModel,
    });
  }

  async getPatternModel(id: string): Promise<PatternModel & Persistent> {
    return this.persistence.findOne<PatternModel>({
      type: PatternManager.type,
      matcher: { id },
    });
  }

  async getPatternModels(id: string): Promise<PatternModel & Persistent> {
    return this.persistence.findOne<PatternModel>({
      type: PatternManager.type,
      matcher: { id },
    });
  }
}
