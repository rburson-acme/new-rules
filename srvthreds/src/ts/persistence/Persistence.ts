import { Persistent } from "../thredlib/persistence/Persistent";

export interface Query {
    type: string;
    matcher?: Record<string, any>;
    selector?: Record<string, any>;
    values?: Record<string, any> | any[];
}

export interface Persistence {

    create(query: Query, options?: any): Promise<void>;

    findOne<T>(query: Query, options?: any): Promise<Persistent & T>;
    
    find<T>(query: Query, options?: any): Promise<(Persistent & T)[]>;

    update(query: Query, options?: any): Promise<void>;

    upsert(query: Query, options?: any): Promise<void>;
    
    replace(query: Query, options?: any): Promise<void>;

    delete(query: Query, options?: any): Promise<void>;

    count(query: Query, options?: any): Promise<number>;

    run(params: any): Promise<any>;

    connect(): Promise<void>;

    disconnect(): Promise<void>;

    removeDatabase(): Promise<void>;

}
