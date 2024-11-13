import { MongoClient, Db, MongoClientOptions } from 'mongodb';
import { Persistence, Query } from '../Persistence.js';
import { MongoSpec } from './MongoSpec.js';
import { Persistent } from '../../thredlib/persistence/Persistent.js';

/*
  @TODO - have database itself generate created and modfied timestamps.  may require use of aggregation pipeline
  @TODO - add support for transactions
  @TODO - implement selectors
*/
export class MongoPersistence implements Persistence {
  private static defaultHost = 'localhost:27017';
  private static defaultDb = 'nr';

  private client: MongoClient;
  private db?: Db;

  constructor(
    private config?: { dbname?: string; connectOptions?: MongoClientOptions }
  ) {
    this.client = new MongoClient(`mongodb://${MongoPersistence.defaultHost}`);
  }

  async connect(): Promise<void> {

    // @TODO secure this
    //const username = encodeURIComponent('root');
    //const password = encodeURIComponent('rootpass');
    await this.client.connect();
    this.db = this.client.db(this.config?.dbname || MongoPersistence.defaultDb);

  }

  async disconnect(): Promise<void> {
    return this.client?.close();
  }

  async create(query: Query, options?: any): Promise<void> {
    if (Array.isArray(query.values)) return this.createAll(query, options);
    if (!query.values) throw Error(`No values specified for query`);
    const mappedValues = MongoSpec.mapInputValues(query.values);
    await this.getCollection(query.type).insertOne(mappedValues);
  }

  private async createAll(query: Query, options?: any): Promise<void> {
    const inputArray = Array.isArray(query.values)
      ? query.values
      : [query.values];
    const mappedValues = MongoSpec.mapInputValues(inputArray);
    await this.getCollection(query.type).insertMany(mappedValues);
  }

  async findOne<T>(query: Query, options?: any): Promise<Persistent & T> {
    if (!query.matcher) query.matcher = {};
    const mappedMatcher = MongoSpec.mapMatcherValues(query.matcher);
    const result = await this.getCollection(query.type).findOne(mappedMatcher);
    return result ? MongoSpec.mapOutputValues(result) : null;
  }

  async find<T>(query: Query, options?: any): Promise<(Persistent & T)[]> {
    if (!query.matcher) query.matcher = {};
    const mappedMatcher = MongoSpec.mapMatcherValues(query.matcher);
    const result = await this.getCollection(query.type)
      .find(mappedMatcher)
      .toArray();
    return result ? MongoSpec.mapOutputValues(result) : null;
  }

  async update(query: Query, options?: any): Promise<void> {
    if (!query.matcher) throw Error(`No matcher specified for query`);
    if (!query.values) throw Error(`No values specified for query`);
    const mappedMatcher = MongoSpec.mapMatcherValues(query.matcher);
    const mappedValues = MongoSpec.mapUpdateValues(query.values);
    await this.getCollection(query.type).updateMany(
      mappedMatcher,
      mappedValues
    );
  }

  async upsert(query: Query, options?: any): Promise<void> {
    if (!query.matcher) throw Error(`No matcher specified for query`);
    if (!query.values) throw Error(`No values specified for query`);
    const mappedMatcher = MongoSpec.mapMatcherValues(query.matcher);
    const mappedValues = MongoSpec.mapUpdateValues(query.values);
    await this.getCollection(query.type).updateMany(
      mappedMatcher,
      mappedValues,
      { upsert: true }
    );
  }

  async replace(query: Query, options?: any): Promise<void> {
    if (!query.matcher) throw Error(`No matcher specified for query`);
    if (!query.values) throw Error(`No values specified for query`);
    const mappedMatcher = MongoSpec.mapMatcherValues(query.matcher);
    const mappedValues = MongoSpec.mapInputValues(query.values);
    const mongoOptions = { upsert: true };
    await this.getCollection(query.type).replaceOne(
      mappedMatcher,
      mappedValues,
      mongoOptions
    );
  }

  async delete(query: Query, options?: any): Promise<void> {
    if (!query.matcher) throw Error(`No matcher specified for query`);
    const mappedMatcher = MongoSpec.mapMatcherValues(query.matcher);
    await this.getCollection(query.type).deleteMany(mappedMatcher);
  }

  async count(query: Query, options?: any): Promise<number> {
    if (!query.matcher) throw Error(`No matcher specified for query`);
    const mappedMatcher = MongoSpec.mapMatcherValues(query.matcher);
    return await this.getCollection(query.type).countDocuments(mappedMatcher);
  }

  // @TODO
  run(params: any): Promise<any> {
    return Promise.resolve();
  }

  async removeDatabase(): Promise<void> {
    await this.db?.dropDatabase();
  }

  private getCollection(type: string) {
    if (!this.db) throw Error(`MongoPersistence: Db is not set`);
    return this.db.collection(type);
  }

}
