import { Pattern } from "../Pattern.js";
import { ThredContext } from "../ThredContext.js";
import { Reaction } from "../Reaction.js";
import { EventStore } from "./EventStore.js";
import { ReactionStore } from "./ReactionStore.js";
import { PatternsStore } from "./PatternsStore.js";
import { Id } from "../Id.js";

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
        const reactionStore = new ReactionStore({ reactionName: pattern.initialReactionName });
        return new ThredStore(id, pattern, reactionStore, thredContext, Date.now());
    }

    transitionTo(reaction?: Reaction): void {
        this._currentReaction = reaction;
        this.reactionStore = new ReactionStore({ reactionName: reaction?.name });
    }

    get currentReaction(): Reaction | undefined {
        return this._currentReaction;
    }

    // This is the proper way to terminate a thred
    // IMPORTANT: This method must be called from within a lock i.e. the ThredsStore.withThredStore()
    finish(): void {
        this.transitionTo(undefined);
    }

    get isFinished() {
        return !this.currentReaction;
    }
    
    get reactionTimedOut(): boolean {
        if (!this.currentReaction?.expiry?.interval) return false;
        return this.reactionStore.isExpired(this.currentReaction.expiry.interval);
    }

    // used for storage
    getState(): ThredStoreState {
        return {
            id: this.id,
            thredContext: this.thredContext.getState(),
            patternId: this.pattern.id,
            reactionStore: this.reactionStore?.getState(),
            startTime: this.startTime
        }
    }

    // used for marshalling to UI
    toJSON()  {
        return {
            id: this.id,
            patternId: this.pattern.id,
            currentReaction: {
                reactionName: this.currentReaction?.name,
                expiry: this.currentReaction?.expiry
            },
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

export interface ThredStoreState {
    id: string,
    thredContext: any,
    patternId: string,
    reactionStore: any,
    startTime: number
}