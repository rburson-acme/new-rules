import { Logger } from '../thredlib/index.js';
import { RedisStorage } from "./RedisStorage.js";
import { Storage } from "./Storage.js";

export class StorageFactory {

    private static storage?: Storage;
    
    static getStorage(): Storage {
        if(!StorageFactory.storage) {
            StorageFactory.storage = new RedisStorage();
        }
        return StorageFactory.storage as never;
    }

    static async disconnectAll(): Promise<void> {
        try {
            await StorageFactory.storage?.disconnect();
        }catch(e) {
            Logger.error(`disconnectAll: `, e);
        }
        StorageFactory.storage = undefined;
    }

    static async purgeAll(): Promise<void> {
        try {
            await StorageFactory.storage?.purgeAll();
        }catch(e) {
            Logger.error(`clearAll: `, e);
        }
    }
}