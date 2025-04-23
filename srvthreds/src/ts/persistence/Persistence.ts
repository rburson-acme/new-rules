import { Taskable } from "../task/Taskable";
import { EventTaskParams } from "../thredlib";
import { Persistent } from "../thredlib/persistence/Persistent";

export interface Query {
    type: string;
    matcher?: EventTaskParams['matcher'];
    selector?: EventTaskParams['selector'];
    collector?: EventTaskParams['collector'];
    values?: EventTaskParams['values'];
}

export interface Persistence extends Taskable {

    getOne<T>(query: Query, options?: any): Promise<Persistent & T | null>;
    
    get<T>(query: Query, options?: any): Promise<(Persistent & T)[] | null>;

    deleteDatabase(): Promise<void>;

}
