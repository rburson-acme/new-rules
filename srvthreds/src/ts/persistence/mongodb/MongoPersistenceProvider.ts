import { MongoClient, MongoClientOptions } from 'mongodb';
import { Persistence, Query } from '../Persistence.js';
import { MongoSpec } from './MongoSpec.js';
import { Persistent } from '../../thredlib/persistence/Persistent.js';
import { PersistenceProvider } from '../../provider/PersistenceProvider.js';
import { MongoPersistence } from './MongoPersistence.js';

/*
  @TODO - have database itself generate created and modfied timestamps.  may require use of aggregation pipeline
  @TODO - add support for transactions
  @TODO - implement selectors
*/
export class MongoPersistenceProvider implements PersistenceProvider {
  private static defaultHost = 'localhost:27017';
  private static defaultDb = 'nr';
  private static DEFAULT_DB_NAME = 'default';

  private client: MongoClient;
  private dbs: Record<string, MongoPersistence> = {};

  constructor(
    hostString?: string,
    config?: { connectOptions?: MongoClientOptions },
  ) {
    const _host = hostString || MongoPersistenceProvider.defaultHost;
    this.client = new MongoClient(`mongodb://${_host}`, config?.connectOptions);
  }

  async connect(): Promise<void> {
    // @TODO secure this
    //const username = encodeURIComponent('root');
    //const password = encodeURIComponent('rootpass');
    await this.client.connect();
  }

  getInstance(dbname?: string): Persistence {
    const _dbname = dbname || MongoPersistenceProvider.DEFAULT_DB_NAME;
    if (!this.dbs[_dbname]) this.dbs[_dbname] = new MongoPersistence(this.client.db(dbname || MongoPersistenceProvider.defaultDb));
    return this.dbs[_dbname];
  }

  async disconnect(): Promise<void> {
    return this.client?.close();
  }

}
