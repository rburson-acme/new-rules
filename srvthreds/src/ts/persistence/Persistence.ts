
export interface Query {
    type: string;
    matcher?: {};
    include?: {};
    values?: {} | any[];
}

export interface Persistence {

    create(query: Query, options?: any): Promise<void>;

    findOne(query: Query, options?: any): Promise<any>;
    
    find(query: Query, options?: any): Promise<any[]>;

    update(query: Query, options?: any): Promise<void>;
    
    replace(query: Query, options?: any): Promise<void>;

    delete(query: Query, options?: any): Promise<void>;

    count(query: Query, options?: any): Promise<number>;

    run(op: string, params: any): Promise<any>;

    connect(): Promise<void>;

    disconnect(): Promise<void>;

}