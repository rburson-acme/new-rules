import { Pattern } from '../Pattern.js';
import { ThredStore } from './ThredStore.js';
import { EventStore } from './EventStore.js';
import { PatternsStore } from './PatternsStore.js';
import { Lock, Storage, Types, indexId } from '../../storage/Storage.js';
import { Logger, Parallel, Series } from '../../thredlib/index.js';

const { forEach } = Parallel;


// Thred locking is handled here, and should be contained to this class

export class ThredsStore {
  constructor(
    readonly eventStore: EventStore,
    readonly patternsStore: PatternsStore,
    readonly storage: Storage,
    private thredStores: { [thredId: string]: ThredStore } = {},
  ) {}

  /*
      create and aquire a lock on the give thread and execute the operation, returning it's result
      lock is released at the end of the operation
  */
  async withNewThredStore(
    pattern: Pattern,
    op: (thredStore: ThredStore) => Promise<any>,
    ttl?: number,
  ): Promise<any> {
    const thredStore = ThredStore.newInstance(pattern, this.eventStore);
    const results = await this.storage.aquire(
      [{ type: Types.Thred, id: thredStore.id }],
      [
        async () => {
          await this.storage.save(Types.Thred, thredStore.getState(), thredStore.id);
          await this.addThredStore(thredStore);
          const result = await op(thredStore);
          await this.saveThredStore(thredStore);
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
  */
  async withThredStore(thredId: string, op: (thredStore?: ThredStore) => Promise<any>, ttl?: number): Promise<any> {
    const results = await this.storage.aquire(
      [{ type: Types.Thred, id: thredId }],
      [
        async () => {
          const thredStore = await this.getThreadStore(thredId);
          const result = await op(thredStore);
          if (thredStore) await this.saveThredStore(thredStore);
          return result;
        },
      ],
      ttl,
    );
    return results[0];
  }

  resetPatternStore(patternId: string): Promise<void> {
    return this.patternsStore.resetPatternStore(patternId);
  }

  get numThreds(): number {
    return this.patternsStore.numThreds;
  }

  async terminateAllThreds(): Promise<void> {
    const thredIds = await this.getAllThredIds();
    return forEach(thredIds, async (thredId: string) => {
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

  // requires lock
  private async getThreadStore(thredId: string): Promise<ThredStore | undefined> {
    const state = await this.storage.retrieve(Types.Thred, thredId);
    if (!state) return undefined;
    const thredStore = ThredStore.fromState(state, this.eventStore, this.patternsStore);
    this.thredStores[thredId] = thredStore;
    return thredStore;
  }

  // requires lock
  private async saveThredStore(thredStore: ThredStore): Promise<void> {
    if (thredStore.isFinished) {
      await this.deleteAndTerminateThred(thredStore.id);
    } else {
      await this.storage.save(Types.Thred, thredStore.getState(), thredStore.id);
    }
  }

  // should only be called with thredId locked
  private async deleteAndTerminateThred(thredId: string): Promise<void> {
    Logger.debug(`releaseAndTerminateThred::terminating Thred ${thredId}`);
    try {
      //If locked, the lock will simply expire
      await this.storage.delete(Types.Thred, thredId);
    } catch (e) {
      Logger.warn(`releaseAndTerminateThred::Failed to delete Thred ${thredId}`);
    }
    return this.terminateThred(thredId);
  }

  private terminateThred(thredId: string): Promise<void> {
    // @todo archive the context so that the thred could be replayed
    const thredStore = this.thredStores[thredId];
    delete this.thredStores[thredId];
    return this.patternsStore.thredEnded(thredStore.pattern.id).catch((e) => {
      Logger.warn(`terminateThred::Failed to update pattern ${thredStore.pattern.id}`);
      throw e;
    });
  }

  private async addThredStore(thredStore: ThredStore): Promise<void> {
    await this.patternsStore.thredStarted(thredStore.pattern.id, thredStore.startTime);
    this.thredStores[thredStore.id] = thredStore;
  }
}
