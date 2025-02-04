export declare function createProxy<T extends object, N extends {
    [key: string]: any;
}>(obj: T, newFields: N): T & N;
