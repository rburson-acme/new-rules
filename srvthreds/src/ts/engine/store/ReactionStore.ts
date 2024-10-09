import { StringMap } from '../../thredlib/index.js';

export class ReactionStore {

    reactionName?: string;
    conditionState: StringMap<any>;

    constructor(reactionName?: string, conditionState?: StringMap<any>) {
        this.reactionName = reactionName;
        this.conditionState = conditionState || {};
    }

    getConditionStateForId(conditionId: number) {
        return this.conditionState[conditionId];
    }

    setConditionStateFor(conditionId: number, state: {}) {
        this.conditionState[conditionId] = state;
    }

    getState() {
        return {
            reactionName: this.reactionName,
            conditionState: this.conditionState
        }
    }

    static fromState(state: any): ReactionStore {
        return new ReactionStore(state.reactionName, state.conditionState);
    }
}