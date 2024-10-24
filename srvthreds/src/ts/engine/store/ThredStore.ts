import { Pattern } from "../Pattern.js";
import { ThredContext } from "../ThredContext.js";
import { Reaction } from "../Reaction.js";
import { Id } from "../Id.js";
import { EventStore } from "./EventStore.js";
import { ReactionStore } from "./ReactionStore.js";
import { PatternsStore } from "./PatternsStore.js";

export class ThredStore {
    
    // @TODO thredContext should become a pointer to a events in a master log (persisted externally)
    private _currentReaction?: Reaction;
    
    private constructor(readonly id: string, readonly pattern: Pattern,  public reactionStore: ReactionStore,
        readonly thredContext: ThredContext, readonly startTime: number) {
            const { reactionName } = reactionStore;
            this._currentReaction = reactionName ? pattern.reactionByName(reactionName) : pattern.initialReaction;
            if (!this._currentReaction) throw Error(`Pattern ${pattern.name} has no reactions or reaction named ${reactionName}. Cannot start Thred.`);
    }

    static newInstance(pattern: Pattern, eventStore: EventStore): ThredStore {
        const id = Id.getNextThredId(pattern.id);
        const thredContext = new ThredContext({ thredId: id });
        const reactionStore = new ReactionStore(pattern.initialReactionName);
        return new ThredStore(id, pattern, reactionStore, thredContext, Date.now());
    }

    transitionTo(reaction?: Reaction): void {
        this._currentReaction = reaction;
        this.reactionStore = new ReactionStore(reaction?.name);
    }

    get currentReaction(): Reaction | undefined {
        return this._currentReaction;
    }

    finish(): void {
        this.transitionTo(undefined);
    }

    get isFinished() {
        return !this.currentReaction;
    }

    getState(): ThredStoreState {
        return {
            id: this.id,
            thredContext: this.thredContext.getState(),
            patternId: this.pattern.id,
            reactionStore: this.reactionStore?.getState(),
            startTime: this.startTime
        }
    }

    static fromState(state: ThredStoreState, eventStore: EventStore, patternsStore: PatternsStore): ThredStore {
        const pattern = patternsStore.getPattern(state.patternId);
        return new ThredStore(
            state.id,
            pattern,
            ReactionStore.fromState(state.reactionStore),
            ThredContext.fromState(state.thredContext, eventStore),
            state.startTime
        );
    }

}

interface ThredStoreState {
    id: string,
    thredContext: any,
    patternId: string,
    reactionStore: any,
    startTime: number
}