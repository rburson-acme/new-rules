import { EventTaskParams } from '../thredlib/index.js';
import { Persistent } from '../thredlib/persistence/Persistent.js';
import { Transaction } from './Transaction.js';

export interface Query {
  type: string;
  // matching criteria
  matcher?: EventTaskParams['matcher'];
  // allows for selection of specific fields
  selector?: EventTaskParams['selector'];
  // allows for sorting, limiting, and skipping results
  collector?: EventTaskParams['collector'];
  // target values for write operations
  values?: EventTaskParams['values'];
}

export interface Taskable {
  put(query: Query, options?: any): Promise<string | string[]>;

  getOne<T>(query: Query, options?: any): Promise<(Persistent & T) | null>;

  get<T>(query: Query, options?: any): Promise<(Persistent & T)[] | null>;

  /*
   * Updates the documents matching the query with the provided values.
   * If no document matches, it will not insert a new document.
   * Use upsert if you want to insert a new document if no match is found.
   */
  update(query: Query, options?: any): Promise<void>;

  /*
   * Upserts the document matching the query with the provided values.
   * If no document matches, it will insert a new document with the provided values.
   * If a document matches, it will update it with the provided values.
   * Returns the ID of the inserted or updated document(s).
   */
  upsert(query: Query, options?: any): Promise<string | string[] | void>;

  /*
   * Replaces the document matching the query with the provided values.
   * If no document matches, it will insert a new document with the provided values.
   */
  replace(query: Query, options?: any): Promise<void>;

  delete(query: Query, options?: any): Promise<void>;

  count(query: Query, options?: any): Promise<number>;

  run(params: any): Promise<any>;
}

export interface Persistence extends Taskable {
  deleteDatabase(): Promise<void>;

  newTransaction(): Transaction;
}
