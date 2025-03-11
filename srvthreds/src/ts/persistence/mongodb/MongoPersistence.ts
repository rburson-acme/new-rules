import { Db } from 'mongodb';
import { Persistence, Query } from '../Persistence.js';
import { MongoSpec } from './MongoSpec.js';
import { Persistent } from '../../thredlib/persistence/Persistent.js';
import { match } from 'node:assert';
import { Spec } from '../../thredlib/index.js';
import { a } from 'vitest/dist/chunks/suite.CcK46U-P.js';

export class MongoPersistence implements Persistence {
  private static defaultHost = 'localhost:27017';
  private static defaultDb = 'nr';

  constructor(private db: Db) {}

  async put(query: Query, options?: any): Promise<string | string[]> {
    if (Array.isArray(query.values)) return this.putAll(query, options);
    if (!query.values) throw Error(`No values specified for query`);
    const mappedValues = MongoSpec.mapInputValues(query.values);
    const result = await this.getCollection(query.type).insertOne(mappedValues);
    return result.insertedId.toString();
  }

  private async putAll(query: Query, options?: any): Promise<string[]> {
    const inputArray = Array.isArray(query.values) ? query.values : [query.values];
    const mappedValues = MongoSpec.mapInputValues(inputArray);
    const result = await this.getCollection(query.type).insertMany(mappedValues);
    let ids = [];
    for (let i = 0; i < Object.keys(result.insertedIds).length; i++) {
      ids.push(result.insertedIds[i].toString());
    }
    return ids;
  }

  async getOne<T>(query: Query, options?: any): Promise<Persistent & T> {
    if (!query.matcher) query.matcher = {};
    const mappedMatcher = MongoSpec.mapMatcherValues(query.matcher);
    const mappedSelector = MongoSpec.mapSelectorValues(query.selector);
    const findOptions = { projection: mappedSelector };
    const result = await this.getCollection(query.type).findOne(mappedMatcher, findOptions);
    return result ? MongoSpec.mapOutputValues(result) : null;
  }

  async get<T>(query: Query, options?: any): Promise<(Persistent & T)[]> {
    if (!query.matcher) query.matcher = {};
    const sort = query.collector?.sort || [];
    const mappedMatcher = MongoSpec.mapMatcherValues(query.matcher);
    const findOptions = {
      projection: MongoSpec.mapSelectorValues(query.selector),
      sort: MongoSpec.mapSortValues(sort),
      skip: query.collector?.skip,
      limit: query.collector?.limit,
    };
    const result = await this.getCollection(query.type).find(mappedMatcher, findOptions).toArray();
    return result ? MongoSpec.mapOutputValues(result) : null;
  }

  async update(query: Query, options?: any): Promise<void> {
    if (!query.matcher) throw Error(`No matcher specified for query`);
    if (!query.values) throw Error(`No values specified for query`);
    const mappedMatcher = MongoSpec.mapMatcherValues(query.matcher);
    const mappedValues = MongoSpec.mapUpdateValues(query.values);
    await this.getCollection(query.type).updateMany(mappedMatcher, mappedValues);
  }

  async upsert(query: Query, options?: any): Promise<string | string[] | void> {
    if (!query.matcher) throw Error(`No matcher specified for query`);
    if (!query.values) throw Error(`No values specified for query`);
    const result = await this.get(query, options);
    if (result.length) {
      return this.update(query, options);
    } else {
      // if the filter contained the objects id, copy it over to the values to be inserted
      if(query.matcher[Spec.ID]) {
        (query.values as Record<string, any>)[Spec.ID] = query.matcher[Spec.ID];
      }
      return this.put(query, options);
    }
  }

  async replace(query: Query, options?: any): Promise<void> {
    if (!query.matcher) throw Error(`No matcher specified for query`);
    if (!query.values) throw Error(`No values specified for query`);
    const mappedMatcher = MongoSpec.mapMatcherValues(query.matcher);
    const mappedValues = MongoSpec.mapInputValues(query.values, true);
    const mongoOptions = { upsert: true };
    await this.getCollection(query.type).replaceOne(mappedMatcher, mappedValues, mongoOptions);
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

  async deleteDatabase(): Promise<void> {
    await this.db?.dropDatabase();
  }

  private getCollection(type: string) {
    return this.db.collection(type);
  }
}
