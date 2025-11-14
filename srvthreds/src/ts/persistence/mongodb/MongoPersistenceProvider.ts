import { MongoClient, MongoClientOptions } from 'mongodb';
import { Persistence, Query } from '../Persistence.js';
import { MongoOperations } from './MongoOperations.js';
import { Persistent } from '../../thredlib/persistence/Persistent.js';
import { PersistenceProvider } from '../../provider/PersistenceProvider.js';
import { MongoPersistence } from './MongoPersistence.js';

/*
  @TODO - have database itself generate created and modfied timestamps.  may require use of aggregation pipeline
  @TODO - add support for transactions
  @TODO - implement selectors
*/
export class MongoPersistenceProvider implements PersistenceProvider {
  private static DEFAULT_HOST = 'localhost:27017';
  private static DEFAULT_DB = 'nr';
  private static DEFAULT_DB_NAME = 'default';

  private client: MongoClient;
  private dbs: Record<string, MongoPersistence> = {};

  constructor(hostString?: string, config?: { connectOptions?: MongoClientOptions }) {
    const _host = hostString || MongoPersistenceProvider.DEFAULT_HOST;
    // Only add replicaSet parameter if not using directConnection
    const connectionString = config?.connectOptions?.directConnection
      ? `mongodb://${_host}/`
      : `mongodb://${_host}/?replicaSet=rs0`;
    this.client = new MongoClient(connectionString, config?.connectOptions);
  }

  async connect(): Promise<void> {
    // @TODO secure this
    //const username = encodeURIComponent('root');
    //const password = encodeURIComponent('rootpass');
    await this.client.connect();
  }

  getInstance(dbname?: string): Persistence {
    const _dbname = dbname || MongoPersistenceProvider.DEFAULT_DB_NAME;
    if (!this.dbs[_dbname])
      this.dbs[_dbname] = new MongoPersistence(
        this.client,
        this.client.db(dbname || MongoPersistenceProvider.DEFAULT_DB),
      );
    return this.dbs[_dbname];
  }

  async disconnect(): Promise<void> {
    return this.client?.close();
  }
}
