import { Taskable } from "../task/Taskable";
import { TaskTransformParams } from "../thredlib";
import { Persistent } from "../thredlib/persistence/Persistent";

export interface Query {
    type: string;
    matcher?: Record<string, any>;
    selector?: Record<string, any>;
    transform?: TaskTransformParams;
    values?: Record<string, any> | any[];
}

export interface Persistence extends Taskable {

    getOne<T>(query: Query, options?: any): Promise<Persistent & T>;
    
    get<T>(query: Query, options?: any): Promise<(Persistent & T)[]>;

    deleteDatabase(): Promise<void>;

}
