import { Pattern } from '../Pattern.js';
import { ThredContext } from '../ThredContext.js';
import { Reaction } from '../Reaction.js';
import { ReactionStore } from './ReactionStore.js';
import { PatternsStore } from './PatternsStore.js';
import { Id } from '../Id.js';
import { EventThrowable } from '../../thredlib/core/Errors.js';
import { errorCodes, errorKeys, Thred, ThredStatus } from '../../thredlib/index.js';

/**
 * The ThredStore class is responsible for managing the state of a Thred.
 * It handles all state changes for a thred, most of which occur within a lock created and held by the ThredsStore
 * Natural termination of a thred occurs when it is transitioned to to an undefined reaction, followed by a call
 * to ThredsStore.saveThredStore()
 */
export class ThredStore {
  // @TODO thredContext should become a pointer to a events in a master log (persisted externally)
  private _currentReaction?: Reaction;
  private lastUpdateTime: number;
  private meta: {
    label?: string;
    description?: string;
    displayUri?: string;
  } = {};

  private constructor(
    readonly id: string,
    readonly pattern: Pattern,
    public reactionStore: ReactionStore,
    readonly thredContext: ThredContext,
    readonly startTime: number,
    private status: ThredStatus,
    private endTime?: number,
  ) {
    const { reactionName } = reactionStore;
    this.lastUpdateTime = startTime;
    this._currentReaction = reactionName ? pattern.reactionByName(reactionName) : pattern.initialReaction;
    if (!this._currentReaction)
      throw Error(`Pattern ${pattern.name} has no reactions or reaction named ${reactionName}. Cannot start Thred.`);
  }

  static newInstance(pattern: Pattern) {
    const id = Id.getNextThredId(pattern.id);
    const thredContext = new ThredContext({ thredId: id });
    const reactionStore = new ReactionStore({ reactionName: pattern.initialReactionName });
    return new ThredStore(id, pattern, reactionStore, thredContext, Date.now(), ThredStatus.ACTIVE);
  }

  transitionTo(reaction?: Reaction): void {
    const now = Date.now();
    // no transition
    if (this._currentReaction === reaction) return;
    this._currentReaction = reaction;
    this.reactionStore = new ReactionStore({ reactionName: reaction?.name });
    this.lastUpdateTime = now;
    // thred is finished if there is no reaction
    if (!reaction) {
      this.endTime = now;
      this.status = this.shouldTerminate() ? ThredStatus.TERMINATED : ThredStatus.FINISHED;
    }
  }

  updateMeta(params: { label?: string; description?: string; displayUri?: string }): void {
    if (params.label) this.meta.label = params.label;
    if (params.description) this.meta.description = params.description;
    if (params.displayUri) this.meta.displayUri = params.displayUri;
  }

  // This is the proper way to get the current reaction
  get currentReaction(): Reaction | undefined {
    return this._currentReaction;
  }

  // This is the proper way to complete a thred
  // IMPORTANT: This method must be called from within a lock - ThredsStore.withThredStore()
  // this will ensure that it actually gets cleaned up
  finish(): void {
    this.transitionTo(undefined);
  }

  // This is the proper way to terminate and archive
  // IMPORTANT: This method must be called from within a lock - ThredsStore.withThredStore()
  // this will ensure that it actually gets cleaned up
  terminate(): void {
    if (this.status !== ThredStatus.FINISHED) this.finish();
    this.status = ThredStatus.TERMINATED;
  }

  addParticipantIds(participantIds: string | string[]) {
    this.thredContext.addParticipantIds(participantIds);
  }

  hasParticipant(participantId: string): boolean {
    return this.thredContext.hasParticipant(participantId);
  }

  get isActive() {
    return this.status === ThredStatus.ACTIVE;
  }

  get isFinished() {
    return this.status === ThredStatus.FINISHED;
  }

  get isTerminated() {
    return this.status === ThredStatus.TERMINATED;
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
      status: this.status,
      lastUpdateTime: this.lastUpdateTime,
      meta: this.meta,
    };
  }

  // used for marshalling to UI
  toJSON(): Thred {
    return {
      id: this.id,
      patternId: this.pattern.id,
      patternName: this.pattern.name,
      broadcastAllowed: this.pattern.broadcastAllowed,
      currentReaction: {
        reactionName: this.currentReaction?.name,
        expiry: this.currentReaction?.expiry,
      },
      startTime: this.startTime,
      endTime: this.endTime,
      status: this.status,
      lastUpdateTime: this.lastUpdateTime,
      meta: this.meta,
    };
  }

  static fromState(state: ThredStoreState, patternsStore: PatternsStore): ThredStore {
    const pattern = patternsStore.getPattern(state.patternId);
    if (!pattern)
      throw EventThrowable.get({
        message: `Pattern ${state.patternId} not loaded for Thred ${state.id}`,
        code: errorCodes[errorKeys.OBJECT_NOT_FOUND].code,
      });
    const thredStore = new ThredStore(
      state.id,
      pattern,
      ReactionStore.fromState(state.reactionStore),
      ThredContext.fromState(state.thredContext),
      state.startTime,
      state.status,
      state.endTime,
    );
    thredStore.lastUpdateTime = state.lastUpdateTime;
    thredStore.updateMeta(state.meta || {});
    return thredStore;
  }

  private shouldTerminate(): boolean {
    // leave thred open if broadcasting is allowed
    return !this.pattern.broadcastAllowed;
  }
}

export interface ThredStoreState {
  id: string;
  thredContext: any;
  patternId: string;
  reactionStore: any;
  startTime: number;
  status: ThredStatus;
  endTime?: number;
  lastUpdateTime: number;
  meta?: {
    label?: string;
    description?: string;
    displayUri?: string;
  };
}
