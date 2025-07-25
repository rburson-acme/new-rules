import { PersistenceProvider } from '../provider/PersistenceProvider.js';
import { Logger } from '../thredlib/index.js';
import { MongoPersistenceProvider } from './mongodb/MongoPersistenceProvider.js';
import { Persistence } from './Persistence.js';

export class PersistenceFactory {
  private static instanceMapByHost: Record<string, PersistenceProvider> = {};

  private static DEFAULT_HOST_NAME = 'default';

  static getPersistenceProvider(hostString?: string): PersistenceProvider {
    const _hostString = hostString || PersistenceFactory.DEFAULT_HOST_NAME;
    if (!PersistenceFactory.instanceMapByHost[_hostString]) {
      PersistenceFactory.instanceMapByHost[_hostString] = hostString
        ? new MongoPersistenceProvider(hostString)
        : new MongoPersistenceProvider();
      PersistenceFactory.connect(_hostString);
    }
    return PersistenceFactory.instanceMapByHost[_hostString];
  }

  static getPersistence(params?: { hostString?: string; dbname?: string }): Persistence {
    const { hostString, dbname } = params || {};
    const persistenceProvider = PersistenceFactory.getPersistenceProvider(hostString);
    return persistenceProvider.getInstance(dbname);
  }

  static connect(hostString?: string): Promise<void> {
    return PersistenceFactory.getPersistenceProvider(hostString).connect();
  }

  static async disconnectAll(): Promise<void> {
    try {
      for (const key in PersistenceFactory.instanceMapByHost) {
        await PersistenceFactory.instanceMapByHost[key].disconnect();
      }
    } catch (e) {
      Logger.error(`disconnectAll: `, e);
    }
    PersistenceFactory.instanceMapByHost = {};
  }

  static async removeDatabase(params?: { hostString?: string; dbname?: string }): Promise<void> {
    const { hostString, dbname } = params || {};
    try {
      const persistence = PersistenceFactory.getPersistence({ hostString, dbname });
      await persistence.deleteDatabase();
    } catch (e) {
      Logger.error(`removeDatabase: `, e);
    }
  }
}
