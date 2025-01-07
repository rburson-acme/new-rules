import { PersistenceManager } from '../engine/persistence/PersistenceManager';
import { PatternsStore } from '../engine/store/PatternsStore';
import { Storage } from '../storage/Storage';
import { StorageFactory } from '../storage/StorageFactory';

export class ConfigLoader {
  static async loadStorageFromPersistence(persistenceManager: PersistenceManager, storage: Storage): Promise<void> {
    const patternModels = await persistenceManager.getAllActivePatterns();
    const patternsStore = new PatternsStore(storage);
    await patternsStore.addPatterns(patternModels);    
  }
}
