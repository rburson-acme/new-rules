import { StringMap } from '../../thredlib/index.js';

export class ReactionStore {
  readonly reactionName?: string;
  private conditionState: StringMap<any>;
  private startTime: number;

  constructor({
    reactionName,
    conditionState,
    startTime,
  }: {
    reactionName?: string;
    conditionState?: StringMap<any>;
    startTime?: number;
  }) {
    this.reactionName = reactionName;
    this.conditionState = conditionState || {};
    this.startTime = startTime || Date.now();
  }

  getStartTime() {
    return this.startTime;
  }

  getConditionStateForId(conditionId: string) {
    return this.conditionState[conditionId];
  }

  setConditionStateFor(conditionId: string, state: {}) {
    this.conditionState[conditionId] = state;
  }

  isExpired(expiry: number) {
    return (Date.now() - this.startTime) > expiry;
  }

  getState() {
    return {
      reactionName: this.reactionName,
      conditionState: this.conditionState,
      startTime: this.startTime,
    };
  }

  static fromState(state: any): ReactionStore {
    return new ReactionStore({
      reactionName: state.reactionName,
      conditionState: state.conditionState,
      startTime: state.startTime,
    });
  }
}
