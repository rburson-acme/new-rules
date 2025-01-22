export interface Query {
    type: string;
    matcher?: Record<string, any>;
    selector?: Record<string, any>;
    values?: Record<string, any> | any[];
}

export interface Taskable {

    put(query: Query, options?: any): Promise<string | string[]>;

    getOne<T>(query: Query, options?: any): Promise<T>;
    
    get<T>(query: Query, options?: any): Promise<T[]>;

    update(query: Query, options?: any): Promise<void>;

    upsert(query: Query, options?: any): Promise<void>;
    
    replace(query: Query, options?: any): Promise<void>;

    delete(query: Query, options?: any): Promise<void>;

    count(query: Query, options?: any): Promise<number>;

    run(params: any): Promise<any>;

}
