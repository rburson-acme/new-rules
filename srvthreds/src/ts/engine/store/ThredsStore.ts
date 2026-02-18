import { Pattern } from '../Pattern.js';
import { ThredStore, ThredStoreState } from './ThredStore.js';
import { PatternsStore } from './PatternsStore.js';
import { Storage, Types, UtilityKeys } from '../../storage/Storage.js';
import { Logger, Parallel } from '../../thredlib/index.js';
import { SystemController as Pm } from '../../persistence/controllers/SystemController.js';
import { ParticipantsStore } from './ParticipantsStore.js';
import { UserController } from '../../persistence/controllers/UserController.js';
import { LockManager } from '../../lib/lock/LockManager.js';

/**
 * The ThredsStore class is responsible for managing ThredStores, which are used to process events in the context of a Thred.
 * Thred locking is handled here, and should be contained to this class
 */
export class ThredsStore {
  constructor(
    readonly patternsStore: PatternsStore,
    readonly storage: Storage,
    private readonly participantsStore: ParticipantsStore,
    private thredStores: { [thredId: string]: ThredStore } = {},
  ) {}

  /*
      Create and acquire a lock on the give thread and execute the operation, returning it's result
      lock is released at the end of the operation
      This method adds the thredStore to thredStores map and removes it after the operation
  */
  async withNewThredStore(pattern: Pattern, op: (thredStore: ThredStore) => Promise<any>, ttl?: number): Promise<any> {
    const thredStore = ThredStore.newInstance(pattern);
    return LockManager.withLock(
      this.storage,
      Types.Thred,
      thredStore.id,
      async () => {
        await this.storage.save({ type: Types.Thred, item: thredStore.getState(), id: thredStore.id });
        await this.addThredStore(thredStore);
        try {
          const result = await op(thredStore);
          await this.saveThredStore(thredStore);
          return result;
        } finally {
          delete this.thredStores[thredStore.id];
        }
      },
      ttl,
    );
  }

  /*
      acquire a lock on the give thread and execute the operation, returning it's result
      lock is released at the end of the operation
      This method adds the thredStore to thredStores map and removes it after the operation
  */
  async withThredStore(thredId: string, op: (thredStore?: ThredStore) => Promise<any>, ttl?: number): Promise<any> {
    return LockManager.withLock(
      this.storage,
      Types.Thred,
      thredId,
      async () => {
        const thredStore = await this.getThreadStore(thredId);
        const prevAllowUnboundEvents = thredStore?.allowUnboundEvents;
        try {
          const result = await op(thredStore);
          if (thredStore) await this.saveThredStore(thredStore, prevAllowUnboundEvents);
          return result;
        } finally {
          delete this.thredStores[thredId];
        }
      },
      ttl,
    );
  }

  get numThreds(): Promise<number> {
    return this.storage.typeCount(Types.Thred);
  }

  // no need to lock - read only
  async getAllThredStoresReadOnly(): Promise<ThredStore[]> {
    return this.getThredStoresReadOnly(await this.getAllThredIds());
  }

  // no need to lock - read only
  async getThredStoresReadOnly(thredIds: string[]): Promise<ThredStore[]> {
    if (thredIds.length === 0) return [];
    const states = await this.storage.retrieveAll({ type: Types.Thred, ids: thredIds });
    return states.map((state) => this.fromThredState(state));
  }

  // no need to lock - read only
  async getThredStoreReadOnly(thredId: string): Promise<ThredStore> {
    const state = await this.storage.retrieve({ type: Types.Thred, id: thredId });
    return this.fromThredState(state);
  }

  // acquire a lock on each thred, terminate and archive the thred
  async terminateAllThreds(): Promise<void> {
    const thredIds = await this.getAllThredIds();
    return Parallel.forEach(thredIds, async (thredId: string) => {
      await LockManager.withLock(this.storage, Types.Thred, thredId, async () => {
        try {
          const thredStore = await this.getThreadStore(thredId);
          if (thredStore) {
            thredStore.terminate();
            await this.deleteAndTerminateThred(thredId);
          }
        } catch (e) {
          Logger.error({
            message: `terminateAllThreds::Failed to properly terminate thred ${thredId}`,
            thredId,
            err: e as Error,
          });
        }
      });
    });
  }

  getAllowUnboundEventsThredIds(): Promise<string[]> {
    return this.storage.retrieveSet({ type: Types.Utility, setId: UtilityKeys.UnboundReaction });
  }

  getAllThredIds(): Promise<string[]> {
    return this.storage.retrieveTypeIds(Types.Thred);
  }

  addThredToParticipantsStore(thredId: string, participantIds: string[]): Promise<void> {
    return this.participantsStore.addThredToParticipants(participantIds, thredId);
  }

  async getThredsForParticipant(participantId: string, thredIds?: string[]): Promise<ThredStore[]> {
    // get all the current thredIds for the participant
    const allThredIds = await this.participantsStore.getParticipantThreds(participantId);
    // if thredIds are provided, filter them to only include those that the participant is actually associated with
    const ownedThreds = thredIds ? thredIds?.filter((thredId) => allThredIds.includes(thredId)) : allThredIds;
    return this.getThredStoresReadOnly(ownedThreds);
  }

  /* MUST BE RUN WITHIN A LOCK (one of the above locking methods) */

  // requires lock
  private async getThreadStore(thredId: string): Promise<ThredStore | undefined> {
    const state = await this.storage.retrieve({ type: Types.Thred, id: thredId });
    if (!state) return undefined;
    return this.fromThredState(state);
  }

  // requires lock
  private fromThredState(state: ThredStoreState): ThredStore {
    const thredStore = ThredStore.fromState(state, this.patternsStore);
    this.thredStores[state.id] = thredStore;
    return thredStore;
  }

  // requires lock
  private async addThredStore(thredStore: ThredStore): Promise<void> {
    this.thredStores[thredStore.id] = thredStore;
  }

  // requires lock
  private async saveThredStore(thredStore: ThredStore, prevAllowUnboundEvents?: boolean): Promise<void> {
    if (thredStore.isTerminated) {
      await this.deleteAndTerminateThred(thredStore.id);
    } else {
      const transaction = this.storage.newTransaction();
      this.storage.save({ type: Types.Thred, item: thredStore.getState(), id: thredStore.id, transaction });
      // if the most recent reaction allows unbound events but the previous one didn't, add the thred to the set
      if (!prevAllowUnboundEvents && thredStore.allowUnboundEvents) {
        this.storage.addToSet({
          type: Types.Utility,
          item: thredStore.id,
          setId: UtilityKeys.UnboundReaction,
          transaction,
        });
      }
      // if the most recent reaction doesn't allow unbound events but the previous one did, remove the thred from the set
      if (prevAllowUnboundEvents && !thredStore.allowUnboundEvents) {
        this.storage.removeFromSet({
          type: Types.Utility,
          item: thredStore.id,
          setId: UtilityKeys.UnboundReaction,
          transaction,
        });
      }
      await transaction.execute();
    }
  }

  // requires lock
  private async deleteAndTerminateThred(thredId: string): Promise<void> {
    Logger.debug({ message: Logger.h2(`deleteAndTerminateThred::terminating Thred ${thredId}`), thredId });
    const thredStore = this.thredStores[thredId];
    try {
      //If locked, the lock will simply expire
      await this.storage.delete({ type: Types.Thred, id: thredId });
    } catch (e) {
      Logger.warn({
        message: Logger.crit(`deleteAndTerminate::Failed to delete Thred ${thredId} from storage`),
        thredId,
      });
    }
    try {
      await this.storage.removeFromSet({ type: Types.Utility, item: thredId, setId: UtilityKeys.UnboundReaction });
    } catch (e) {
      Logger.warn({
        message: Logger.crit(
          `deleteAndTerminate::Failed to remove Thred ${thredId} from unbound reactions set in storage`,
        ),
        thredId,
      });
    }
    // move the user/thred associations to the archive
    const participantAddresses = thredStore.thredContext.getParticipantAddresses();
    try {
      await this.participantsStore.removeThredFromParticipants(participantAddresses, thredId);
    } catch (e) {
      Logger.warn({
        message: Logger.crit(`deleteAndTerminate::Failed to remove thred ${thredId} from participants in storage`),
        thredId,
      });
    }
    // associate the thredId with each User (participant)
    try {
      await UserController.get().addArchivedThredIdToUsers(participantAddresses, thredId);
    } catch (e) {
      Logger.warn({
        message: Logger.crit(`deleteAndTerminate::Failed to add archived thredId to Users for thred ${thredId}`),
        thredId,
      });
    }
    // @todo archive the context and the reactionstore so that the thred could be replayed
    delete this.thredStores[thredId];
    try {
      await Pm.get().saveThredRecord({ id: thredId, thred: thredStore.toJSON() });
    } catch (e) {
      Logger.error({
        message: Logger.crit(`deleteAndTerminate::Failed to save ThredRecord ${thredId} to archive`),
        thredId,
      });
      //throw ThredThrowable.get( { cause: e, message: 'Failed to save Thred to archive' }, 'sender', thredStore.thredContext,);
    }
  }
}
