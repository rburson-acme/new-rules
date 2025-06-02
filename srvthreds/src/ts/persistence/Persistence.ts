import { Taskable } from '../task/Taskable';
import { EventTaskParams } from '../thredlib';
import { Persistent } from '../thredlib/persistence/Persistent';

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

export interface Persistence extends Taskable {
  getOne<T>(query: Query, options?: any): Promise<(Persistent & T) | null>;

  get<T>(query: Query, options?: any): Promise<(Persistent & T)[] | null>;

  deleteDatabase(): Promise<void>;
}
