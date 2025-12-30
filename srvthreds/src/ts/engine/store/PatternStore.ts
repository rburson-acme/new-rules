import { PatternModel } from '../../thredlib/index.js';
import { Pattern } from '../Pattern.js';

export class PatternStore {
  static TIMESTAMP_KEY = 'ts';
  static NUM_INSTANCE_KEY = 'ni';
  static LAST_INSTANCE_TIMESTAMP_KEY = 'li';
  readonly pattern: Pattern;

  constructor(
    readonly patternModel: PatternModel,
    readonly timestamp: number,
  ) {
    this.pattern = new Pattern(patternModel);
  }

  isStale(newTimestamp: number): boolean {
    return this.timestamp < newTimestamp;
  }

  getState(): PatternStoreState {
    return { patternModel: this.patternModel, timestamp: this.timestamp };
  }

  static fromState(state: PatternStoreState): PatternStore {
    return new PatternStore(state.patternModel, state.timestamp);
  }
}

interface PatternStoreState {
  patternModel: PatternModel;
  timestamp: number;
}
