import { Logger } from '../thredlib/index.js';
import { MongoPersistence } from './mongodb/MongoPersistence.js';
import { Persistence } from './Persistence.js';

export class PersistenceFactory {
  private static instanceMap: Record<string, Persistence> = {};

  private static DEFAULT_DB_NAME = 'default';

  static getPersistence(dbname?: string): Persistence {
    const _dbname = dbname || PersistenceFactory.DEFAULT_DB_NAME;
    if (!PersistenceFactory.instanceMap[_dbname]) {
      PersistenceFactory.instanceMap[_dbname] = dbname ? new MongoPersistence({ dbname }) : new MongoPersistence();
    }
    return PersistenceFactory.instanceMap[_dbname];
  }

  static async disconnectAll(): Promise<void> {
    try {
      for (const key in PersistenceFactory.instanceMap) {
        await PersistenceFactory.instanceMap[key].disconnect();
      }
    } catch (e) {
      Logger.error(`disconnectAll: `, e);
    }
    PersistenceFactory.instanceMap = {};
  }

  static async removeDatabase(dbname?: string): Promise<void> {
    try {
      if (dbname) {
        await (dbname
          ? PersistenceFactory.instanceMap[dbname].removeDatabase()
          : PersistenceFactory.instanceMap[PersistenceFactory.DEFAULT_DB_NAME].removeDatabase());
      }
    } catch (e) {
      Logger.error(`removeDatabase: `, e);
    }
  }
}
