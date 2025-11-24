import { PersistenceProvider } from '../provider/PersistenceProvider.js';
import { Logger } from '../thredlib/index.js';
import { MongoPersistenceProvider } from './mongodb/MongoPersistenceProvider.js';
import { Persistence } from './Persistence.js';

export class PersistenceFactory {
  private static instanceMapByHost: Record<string, PersistenceProvider> = {};

  private static DEFAULT_HOST_NAME = 'localhost:27017';

  static getPersistenceProvider(hostString?: string, directConnection?: boolean): PersistenceProvider {
    // TODO: Look at handling the host string farther up the stack
    const _hostString = hostString || process.env.MONGO_HOST || PersistenceFactory.DEFAULT_HOST_NAME;
    // const _hostString = hostString || PersistenceFactory.DEFAULT_HOST_NAME;
    if (!PersistenceFactory.instanceMapByHost[_hostString]) {
      const _directConnection = directConnection ?? process.env.MONGO_DIRECT_CONNECTION === 'true';
      const options = { connectOptions: { directConnection: _directConnection } };
      PersistenceFactory.instanceMapByHost[_hostString] = new MongoPersistenceProvider(_hostString, options);
      PersistenceFactory.connect(_hostString);
    }
    return PersistenceFactory.instanceMapByHost[_hostString];
  }

  static getPersistence(params?: { hostString?: string; dbname?: string; directConnection?: boolean }): Persistence {
    const { hostString, dbname, directConnection } = params || {};
    const persistenceProvider = PersistenceFactory.getPersistenceProvider(hostString, directConnection);
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
