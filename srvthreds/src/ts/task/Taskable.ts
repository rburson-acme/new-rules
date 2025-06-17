export interface Query {
  type: string;
  matcher?: Record<string, any>;
  selector?: Record<string, any>;
  values?: Record<string, any> | any[];
}

export interface Taskable {
  put(query: Query, options?: any): Promise<string | string[]>;

  getOne<T>(query: Query, options?: any): Promise<T | null>;

  get<T>(query: Query, options?: any): Promise<T[] | null>;

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
