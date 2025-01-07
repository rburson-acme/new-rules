import { Provider } from "../provider/Provider";
import { Persistent } from "../thredlib/persistence/Persistent";

export interface Query {
    type: string;
    matcher?: Record<string, any>;
    selector?: Record<string, any>;
    values?: Record<string, any> | any[];
}

export interface Persistence extends Provider {

    getOne<T>(query: Query, options?: any): Promise<Persistent & T>;
    
    get<T>(query: Query, options?: any): Promise<(Persistent & T)[]>;

    removeDatabase(): Promise<void>;

}
