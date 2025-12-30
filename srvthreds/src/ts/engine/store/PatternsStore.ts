import { Pattern } from '../Pattern.js';
import { PatternStore } from './PatternStore.js';
import { Storage, Types } from '../../storage/Storage.js';
import { Logger, PatternModel, Series } from '../../thredlib/index.js';

/*****************************************************************************************************
 - Pattern locking is handled here and should be contained to this class
 - This class works directly with the memory cache and does not interact with the persistence layer
 - The cached patternStores load at init time and then stay in sync with the storage layer via pubsub
*****************************************************************************************************/

export class PatternsStore {
  private patternStores: { [patternId: string]: PatternStore } = {};

  constructor(readonly storage: Storage) {}

  // load all patterns that are already cached in storage
  async loadPatterns(): Promise<void> {
    const patternIds = await this.storage.retrieveTypeIds(Types.Pattern);
    await Series.forEach(patternIds, async (patternId) => {
      await this.loadPattern(patternId);
    });
  }

  // add patterns to store and cache them in storage
  async addPatterns(patternModels: PatternModel[]): Promise<void> {
    await Series.forEach(patternModels, async (patternModel) => {
      const patternStore = new PatternStore(patternModel, patternModel.modified?.getTime() || new Date().getTime());
      const patternId = patternStore.pattern.id;
      this.patternStores[patternId] = patternStore;
      await this.storePattern(patternStore, this.storage);
      Logger.info(`Added Pattern: ${patternModel.id} : ${patternModel.name}`);
    });
  }

  /*
      Check the timestamp of the pattern against the timestamp in storage and reload if stale
    */
  async staleCheck(patternId: string): Promise<void> {
    const patternStore = this.patternStore(patternId);
    const tsValue = await this.storage.getMetaValue(Types.Pattern, patternId, PatternStore.TIMESTAMP_KEY);
    const timestamp = tsValue ? parseInt(tsValue) : new Date().getTime();
    if (patternStore.isStale(timestamp)) {
      await this.loadPattern(patternId);
    }
  }

  // load a pattern from storage w/ lock
  async loadPattern(patternId: string): Promise<void> {
    await this.withLock(patternId, async () => {
      await this.lock_loadPatternStore(patternId);
    });
  }

  // store a pattern model in storage w/ lock
  async storePatternModel(patternModel: PatternModel): Promise<void> {
    const patternStore = new PatternStore(patternModel, patternModel.modified?.getTime() || new Date().getTime());
    await this.storePattern(patternStore, this.storage);
  }

  // gets a currently loaded pattern
  getPattern(patternId: string): Pattern {
    return this.patternStores[patternId]?.pattern;
  }

  // get a currently loaded pattern store
  patternStore(patternId: string): PatternStore {
    return this.patternStores[patternId];
  }

  // get the number of patterns currently loaded
  get numLoadedPatterns(): number {
    return Object.keys(this.patternStores).length;
  }

  // gets all currently loaded patterns
  get patterns(): Pattern[] {
    return Object.values(this.patternStores).map((patternStore) => patternStore.pattern);
  }

  // unload a pattern store
  async unloadPatternStore(patternId: string): Promise<void> {
    this.storage.acquire(
      [{ type: Types.Pattern, id: patternId }],
      [
        async () => {
          try {
            await this.lock_unloadPatternStore(patternId);
          } catch (e) {
            throw new Error(`Could not unload pattern store for patternId ${patternId}`, { cause: e });
          }
        },
      ],
    );
  }

  async decrementPatternInstanceCount(patternId: string): Promise<void> {
    await this.withLock(patternId, async () => {
      const patternStore = this.patternStore(patternId);
      if (!patternStore) throw new Error(`PatternStore not found for patternId ${patternId}`);
      const instanceCount = (await this.lock_retrievePatternInstanceCount(patternId)) || 0;
      if (instanceCount > 0) {
        await this.lock_storePatternInstanceCount(patternId, instanceCount - 1);
      }
    });
  }

  /*
      acquire a lock for creating a new thread from the given pattern
      checks pattern constraints (max instances, min interval) and updates usage stats
  */
  async withLockForNewThread<T>(patternId: string, op: () => Promise<T>, ttl?: number): Promise<T> {
    return this.withLock(
      patternId,
      async () => {
        const patternStore = this.patternStore(patternId);
        if (!patternStore) throw new Error(`PatternStore not found for patternId ${patternId}`);
        const { instanceCount, lastInstanceTs } = await this.lock_checkPatternInstanceCountAndTimestamp(patternId);
        const result = await op();
        await this.lock_storePatternInstanceCount(patternId, instanceCount + 1);
        await this.lock_storePatternLastInstanceTimestamp(patternId, Date.now());
        return result;
      },
      ttl,
    );
  }

  /*
      acquire a lock on the given pattern and execute the operation, returning it's result
      lock is released at the end of the operation
  */
  private async withLock(patternId: string, op: () => Promise<any>, ttl?: number): Promise<any> {
    const result = await this.storage.acquire([{ type: Types.Pattern, id: patternId }], [async () => await op()], ttl);
    return result[0];
  }

  // store a pattern in storage w/ lock
  private async storePattern(patternStore: PatternStore, storage: Storage): Promise<void> {
    await this.withLock(patternStore.pattern.id, async () => {
      await this.lock_storePatternStore(patternStore, storage);
    });
  }

  //*****************************************************************************
  // Important - callers of the below methods should do so within a locked block
  //*****************************************************************************

  // requires lock
  private async lock_unloadPatternStore(patternId: string): Promise<void> {
    const patternStore = this.patternStore(patternId);
    if (patternStore) {
      await this.storage.delete(Types.Pattern, patternId);
    }
    delete this.patternStores[patternId];
  }

  // requires lock
  private async lock_loadPatternStore(patternId: string): Promise<PatternStore> {
    const patternModel = await this.storage.retrieve(Types.Pattern, patternId);
    const tsValue = await this.storage.getMetaValue(Types.Pattern, patternId, PatternStore.TIMESTAMP_KEY);
    const timestamp = tsValue ? parseInt(tsValue) : new Date().getTime();
    if (patternModel) this.patternStores[patternId] = PatternStore.fromState({ patternModel, timestamp });
    Logger.info(`Loaded Pattern: ${patternModel.id} : ${patternModel.name}`);
    return this.patternStore(patternId);
  }

  // requires lock
  private async lock_storePatternStore(patternStore: PatternStore, storage: Storage): Promise<void> {
    const patternId = patternStore.pattern.id;
    const { patternModel, timestamp } = patternStore.getState();
    await storage.save(Types.Pattern, patternModel, patternId);
    await storage.setMetaValue(Types.Pattern, patternId, PatternStore.TIMESTAMP_KEY, timestamp);
  }
  // requires lock
  private async lock_retrievePatternInstanceCount(patternId: string): Promise<number | null> {
    const numInstances = await this.storage.getMetaValue(Types.Pattern, patternId, PatternStore.NUM_INSTANCE_KEY);
    return numInstances ? parseInt(numInstances) : null;
  }
  // requires lock
  private async lock_storePatternInstanceCount(patternId: string, numInstances: number): Promise<void> {
    await this.storage.setMetaValue(Types.Pattern, patternId, PatternStore.NUM_INSTANCE_KEY, numInstances);
  }

  // requires lock
  private async lock_retrievePatternLastInstanceTimestamp(patternId: string): Promise<number | null> {
    const tsValue = await this.storage.getMetaValue(Types.Pattern, patternId, PatternStore.LAST_INSTANCE_TIMESTAMP_KEY);
    return tsValue ? parseInt(tsValue) : null;
  }

  // requires lock
  private async lock_storePatternLastInstanceTimestamp(patternId: string, timestamp: number): Promise<void> {
    await this.storage.setMetaValue(Types.Pattern, patternId, PatternStore.LAST_INSTANCE_TIMESTAMP_KEY, timestamp);
  }

  // requires lock
  private async lock_checkPatternInstanceCountAndTimestamp(
    patternId: string,
  ): Promise<{ instanceCount: number; lastInstanceTs: number }> {
    const patternStore = this.patternStore(patternId);
    const pattern = patternStore.pattern;
    const maxInstances = pattern.patternModel.maxInstances || Infinity;
    const instanceCount = (await this.lock_retrievePatternInstanceCount(patternId)) || 0;
    const lastInstanceTs = (await this.lock_retrievePatternLastInstanceTimestamp(patternId)) || 0;
    const now = Date.now();
    if (instanceCount >= maxInstances) {
      throw new Error(`Pattern ${patternId} has reached its maximum number of instances: ${maxInstances}`);
    }
    const minInterval = pattern.patternModel.instanceInterval || 0;
    if (now - lastInstanceTs < minInterval) {
      throw new Error(`Pattern ${patternId} cannot create a new instance yet. Minimum interval
          between instances is ${minInterval} ms`);
    }
    return { instanceCount, lastInstanceTs };
  }
}
