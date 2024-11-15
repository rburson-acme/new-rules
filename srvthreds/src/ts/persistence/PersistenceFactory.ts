import { Logger } from '../thredlib/index.js';
import { MongoPersistence } from './mongodb/MongoPersistence.js';
import { Persistence } from './Persistence.js';

export class PersistenceFactory {

    private static persistence?: Persistence;
    
    static getPersistence(): Persistence {
        if(!PersistenceFactory.persistence) {
            PersistenceFactory.persistence = new MongoPersistence();
        }
        return PersistenceFactory.persistence as never;
    }

    static async disconnectAll(): Promise<void> {
        try {
            await PersistenceFactory.persistence?.disconnect();
        }catch(e) {
            Logger.error(`disconnectAll: `, e);
        }
        PersistenceFactory.persistence = undefined;
    }

    static async removeDatabase(): Promise<void> {
        try {
            await PersistenceFactory.persistence?.removeDatabase();
        }catch(e) {
            Logger.error(`clearAll: `, e);
        }
    }
}