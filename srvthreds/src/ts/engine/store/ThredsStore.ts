import { Pattern } from '../Pattern.js';
import { ThredStore, ThredStoreState } from './ThredStore.js';
import { PatternsStore } from './PatternsStore.js';
import { Storage, Types, indexId } from '../../storage/Storage.js';
import { Logger, Parallel } from '../../thredlib/index.js';
import { SystemController as Pm } from '../../persistence/controllers/SystemController.js';
import { ThredThrowable } from '../ThredThrowable.js';
import { ParticipantsStore } from './ParticipantsStore.js';

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
      Create and aquire a lock on the give thread and execute the operation, returning it's result
      lock is released at the end of the operation
      This method adds the thredStore to thredStores map and removes it after the operation 
  */
  async withNewThredStore(pattern: Pattern, op: (thredStore: ThredStore) => Promise<any>, ttl?: number): Promise<any> {
    const thredStore = ThredStore.newInstance(pattern);
    const results = await this.storage.aquire(
      [{ type: Types.Thred, id: thredStore.id }],
      [
        async () => {
          await this.storage.save(Types.Thred, thredStore.getState(), thredStore.id);
          await this.addThredStore(thredStore);
          try {
            const result = await op(thredStore);
            await this.saveThredStore(thredStore);
            return result;
          } finally {
            delete this.thredStores[thredStore.id];
          }
        },
      ],
      ttl,
    );
    return results[0];
  }

  /*
      aquire a lock on the give thread and execute the operation, returning it's result
      lock is released at the end of the operation
      This method adds the thredStore to thredStores map and removes it after the operation 
  */
  async withThredStore(thredId: string, op: (thredStore?: ThredStore) => Promise<any>, ttl?: number): Promise<any> {
    const results = await this.storage.aquire(
      [{ type: Types.Thred, id: thredId }],
      [
        async () => {
          const thredStore = await this.getThreadStore(thredId);
          try {
            const result = await op(thredStore);
            if (thredStore) await this.saveThredStore(thredStore);
            return result;
          } finally {
            delete this.thredStores[thredId];
          }
        },
      ],
      ttl,
    );
    return results[0];
  }

  get numThreds(): Promise<number> {
    return this.storage.setCount(Types.Thred, indexId);
  }

  // no need to lock - read only
  async getAllThredStores(): Promise<ThredStore[]> {
    return this.getThredStores(await this.getAllThredIds());
  }

  // no need to lock - read only
  async getThredStores(thredIds: string[]): Promise<ThredStore[]> {
    if (thredIds.length === 0) return [];
    const states = await this.storage.retrieveAll(Types.Thred, thredIds);
    return states.map((state) => this.fromThredState(state));
  }

  // aquire a lock on each thred, terminate and archive the thred
  async terminateAllThreds(): Promise<void> {
    const thredIds = await this.getAllThredIds();
    return Parallel.forEach(thredIds, async (thredId: string) => {
      const results = await this.storage.aquire(
        [{ type: Types.Thred, id: thredId }],
        [
          async () => {
            try {
              const thredStore = await this.getThreadStore(thredId);
              if (thredStore) {
                thredStore.terminate();
                await this.deleteAndTerminateThred(thredId);
              }
            } catch (e) {
              Logger.error(`terminateAllThreds::Failed to properly terminate thred ${thredId}`, e);
            }
          },
        ],
      );
    });
  }

  getAllThredIds(): Promise<string[]> {
    return this.storage.retrieveSet(Types.Thred, indexId);
  }

  addThredToParticipants(thredId: string, participantIds: string[]): Promise<void> {
    return this.participantsStore.addThredToParticipants(participantIds, thredId);
  }

  /* MUST BE RUN WITHIN A LOCK (one of the above locking methods) */

  // requires lock
  private async getThreadStore(thredId: string): Promise<ThredStore | undefined> {
    const state = await this.storage.retrieve(Types.Thred, thredId);
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
  private async saveThredStore(thredStore: ThredStore): Promise<void> {
    if (thredStore.isTerminated) {
      await this.deleteAndTerminateThred(thredStore.id);
    } else {
      await this.storage.save(Types.Thred, thredStore.getState(), thredStore.id);
    }
  }

  // requires lock
  private async deleteAndTerminateThred(thredId: string): Promise<void> {
    Logger.debug(Logger.h2(`deleteAndTerminateThred::terminating Thred ${thredId}`));
    try {
      //If locked, the lock will simply expire
      await this.storage.delete(Types.Thred, thredId);
    } catch (e) {
      Logger.warn(Logger.crit(`deleteAndTerminate::Failed to delete Thred ${thredId}`));
    }
    // @todo archive the context and the reactionstore so that the thred could be replayed
    const thredStore = this.thredStores[thredId];
    delete this.thredStores[thredId];
    try {
      await Pm.get().saveThredRecord({ id: thredId, thred: thredStore.toJSON() });
    } catch (e) {
      Logger.error(Logger.crit(`deleteAndTerminate::Failed to save Thred ${thredId} to archive`));
      throw ThredThrowable.get(
        { cause: e, message: 'Failed to save Thred to archive' },
        'sender',
        thredStore.thredContext,
      );
    }
  }
}
