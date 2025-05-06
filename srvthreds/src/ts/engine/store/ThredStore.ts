import { Pattern } from '../Pattern.js';
import { ThredContext } from '../ThredContext.js';
import { Reaction } from '../Reaction.js';
import { ReactionStore } from './ReactionStore.js';
import { PatternsStore } from './PatternsStore.js';
import { Id } from '../Id.js';
import { EventThrowable } from '../../thredlib/core/Errors.js';
import { errorCodes, errorKeys, Thred } from '../../thredlib/index.js';

/*
  - Handles all state changes for a thred, most of which occur within a lock created and held by the ThredsStore
  - Natural termination of a thred occurs when it is transitioned to to an undefined reaction, followed by a call
    to ThredsStore.saveThredStore()
*/
export class ThredStore {
  // @TODO thredContext should become a pointer to a events in a master log (persisted externally)
  private _currentReaction?: Reaction;

  private constructor(
    readonly id: string,
    readonly pattern: Pattern,
    public reactionStore: ReactionStore,
    readonly thredContext: ThredContext,
    readonly startTime: number,
    private endTime?: number,
  ) {
    const { reactionName } = reactionStore;
    this._currentReaction = reactionName ? pattern.reactionByName(reactionName) : pattern.initialReaction;
    if (!this._currentReaction)
      throw Error(`Pattern ${pattern.name} has no reactions or reaction named ${reactionName}. Cannot start Thred.`);
  }

  static newInstance(pattern: Pattern) {
    const id = Id.getNextThredId(pattern.id);
    const thredContext = new ThredContext({ thredId: id });
    const reactionStore = new ReactionStore({ reactionName: pattern.initialReactionName });
    return new ThredStore(id, pattern, reactionStore, thredContext, Date.now());
  }

  transitionTo(reaction?: Reaction): void {
    if (!reaction) this.endTime = Date.now();
    this._currentReaction = reaction;
    this.reactionStore = new ReactionStore({ reactionName: reaction?.name });
  }

  get currentReaction(): Reaction | undefined {
    return this._currentReaction;
  }

  // This is the proper way to terminate a thred
  // IMPORTANT: This method must be called from within a lock - ThredsStore.withThredStore()
  // this will ensure that it actually gets cleaned up
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
      startTime: this.startTime,
      endTime: this.endTime,
    };
  }

  // used for marshalling to UI
  toJSON(): Thred {
    return {
      id: this.id,
      patternId: this.pattern.id,
      patternName: this.pattern.name,
      currentReaction: {
        reactionName: this.currentReaction?.name,
        expiry: this.currentReaction?.expiry,
      },
      startTime: this.startTime,
      endTime: this.endTime,
    };
  }

  static fromState(state: ThredStoreState, patternsStore: PatternsStore): ThredStore {
    const pattern = patternsStore.getPattern(state.patternId);
    if (!pattern)
      throw EventThrowable.get({
        message: `Pattern ${state.patternId} not loaded for Thred ${state.id}`,
        code: errorCodes[errorKeys.OBJECT_NOT_FOUND].code,
      });
    return new ThredStore(
      state.id,
      pattern,
      ReactionStore.fromState(state.reactionStore),
      ThredContext.fromState(state.thredContext),
      state.startTime,
    );
  }
}

export interface ThredStoreState {
  id: string;
  thredContext: any;
  patternId: string;
  reactionStore: any;
  startTime: number;
  endTime?: number;
}
