import { Pattern } from '../Pattern.js';
import { ThredStore, ThredStoreState } from './ThredStore.js';
import { PatternsStore } from './PatternsStore.js';
import { Storage, Types, indexId } from '../../storage/Storage.js';
import { errorCodes, errorKeys, Logger, Parallel } from '../../thredlib/index.js';
import { EventThrowable } from '../../thredlib/core/Errors.js';
import { EventsStore } from './EventsStore.js';
import { PersistenceManager as Pm } from '../persistence/PersistenceManager.js';

// Thred locking is handled here, and should be contained to this class

export class ThredsStore {
  constructor(
    readonly patternsStore: PatternsStore,
    readonly storage: Storage,
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
          const result = await op(thredStore);
          await this.saveThredStore(thredStore);
          delete this.thredStores[thredStore.id];
          return result;
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
          const result = await op(thredStore);
          if (thredStore) await this.saveThredStore(thredStore);
          delete this.thredStores[thredId];
          return result;
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

  // aquire a lock on each thred and terminate the thred
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
                thredStore.finish();
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
    if (thredStore.isFinished) {
      await this.deleteAndTerminateThred(thredStore.id);
    } else {
      await this.storage.save(Types.Thred, thredStore.getState(), thredStore.id);
    }
  }

  // requires lock
  private async deleteAndTerminateThred(thredId: string): Promise<void> {
    Logger.debug(Logger.h2(`releaseAndTerminateThred::terminating Thred ${thredId}`));
    try {
      //If locked, the lock will simply expire
      await this.storage.delete(Types.Thred, thredId);
    } catch (e) {
      Logger.warn(Logger.crit(`releaseAndTerminateThred::Failed to delete Thred ${thredId}`));
    }
    // @todo archive the context so that the thred could be replayed
    const thredStore = this.thredStores[thredId];
    delete this.thredStores[thredId];
    await Pm.get().saveThredRecord({ id: thredId, thred: thredStore.toJSON() });
  }
}
