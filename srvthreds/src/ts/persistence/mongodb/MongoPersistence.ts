import { ClientSession, Db, MongoClient } from 'mongodb';
import { Persistence, Query } from '../Persistence.js';
import { MongoOperations } from './MongoOperations.js';
import { Persistent } from '../../thredlib/persistence/Persistent.js';
import { Operations } from '../../thredlib/index.js';
import { Transaction } from '../Transaction.js';
import { MongoTransaction } from './MongoTransaction.js';

export class MongoPersistence implements Persistence {
  constructor(
    private client: MongoClient,
    private db: Db,
  ) {}

  newTransaction(): Transaction {
    return new MongoTransaction(this.client.startSession());
  }

  async put(query: Query, options?: any): Promise<string | string[]> {
    if (Array.isArray(query.values)) return this.putAll(query, options);
    if (!query.values) throw Error(`No values specified for query`);
    const mappedValues = MongoOperations.mapInputValues(query.values);
    const _options = this.mapOptions(options);
    const result = await this.getCollection(query.type).insertOne(mappedValues, _options);
    return result.insertedId.toString();
  }

  private async putAll(query: Query, options?: any): Promise<string[]> {
    const inputArray = Array.isArray(query.values) ? query.values : [query.values];
    const mappedValues = MongoOperations.mapInputValues(inputArray);
    const _options = this.mapOptions(options);
    const result = await this.getCollection(query.type).insertMany(mappedValues, _options);
    let ids = [];
    for (let i = 0; i < Object.keys(result.insertedIds).length; i++) {
      ids.push(result.insertedIds[i].toString());
    }
    return ids;
  }

  async getOne<T>(query: Query, options?: any): Promise<(Persistent & T) | null> {
    if (!query.matcher) query.matcher = {};
    const mappedMatcher = MongoOperations.mapMatcherValues(query.matcher);
    const mappedSelector = MongoOperations.mapSelectorValues(query.selector);
    const _options = this.mapOptions(options);
    const findOptions = { ..._options, projection: mappedSelector };
    const result = await this.getCollection(query.type).findOne(mappedMatcher, findOptions);
    return result ? MongoOperations.mapOutputValues(result) : null;
  }

  async get<T>(query: Query, options?: any): Promise<(Persistent & T)[] | null> {
    if (!query.matcher) query.matcher = {};
    const sort = query.collector?.sort || [];
    const mappedMatcher = MongoOperations.mapMatcherValues(query.matcher);
    const _options = this.mapOptions(options);
    const findOptions = {
      ..._options,
      projection: MongoOperations.mapSelectorValues(query.selector),
      sort: MongoOperations.mapSortValues(sort),
      skip: query.collector?.skip,
      limit: query.collector?.limit,
    };
    const result = await this.getCollection(query.type).find(mappedMatcher, findOptions).toArray();
    return result ? MongoOperations.mapOutputValues(result) : null;
  }

  async update(query: Query, options?: any): Promise<void> {
    if (!query.matcher) throw Error(`No matcher specified for query`);
    if (!query.values) throw Error(`No values specified for query`);
    const mappedMatcher = MongoOperations.mapMatcherValues(query.matcher);
    const mappedValues = MongoOperations.mapUpdateValues(query.values);
    const _options = this.mapOptions(options);
    await this.getCollection(query.type).updateMany(mappedMatcher, mappedValues, _options);
  }

  async upsert(query: Query, options?: any): Promise<string | string[] | void> {
    if (!query.matcher) throw Error(`No matcher specified for query`);
    if (!query.values) throw Error(`No values specified for query`);
    const mappedMatcher = MongoOperations.mapMatcherValues(query.matcher);
    const mappedValues = MongoOperations.mapUpdateValues(query.values);
    const _options = this.mapOptions(options);
    const mongoOptions = { _options, upsert: true };
    await this.getCollection(query.type).updateOne(mappedMatcher, mappedValues, mongoOptions);
  }

  async replace(query: Query, options?: any): Promise<void> {
    if (!query.matcher) throw Error(`No matcher specified for query`);
    if (!query.values) throw Error(`No values specified for query`);
    const mappedMatcher = MongoOperations.mapMatcherValues(query.matcher);
    const mappedValues = MongoOperations.mapInputValues(query.values, true);
    const _options = this.mapOptions(options);
    const mongoOptions = { _options, upsert: true };
    await this.getCollection(query.type).replaceOne(mappedMatcher, mappedValues, mongoOptions);
  }

  async delete(query: Query, options?: any): Promise<void> {
    if (!query.matcher) throw Error(`No matcher specified for query`);
    const mappedMatcher = MongoOperations.mapMatcherValues(query.matcher);
    const _options = this.mapOptions(options);
    await this.getCollection(query.type).deleteMany(mappedMatcher, _options);
  }

  async count(query: Query, options?: any): Promise<number> {
    if (!query.matcher) throw Error(`No matcher specified for query`);
    const mappedMatcher = MongoOperations.mapMatcherValues(query.matcher);
    const _options = this.mapOptions(options);
    return await this.getCollection(query.type).countDocuments(mappedMatcher, _options);
  }

  // @TODO
  run(params: any): Promise<any> {
    return Promise.resolve();
  }

  async deleteDatabase(): Promise<void> {
    await this.db?.dropDatabase();
  }

  private getCollection(type: string) {
    return this.db.collection(type);
  }

  private mapOptions(options: any): any {
    if (options?.transaction) {
      return { session: options.transaction.getSession() };
    }
    return undefined;
  }
}
