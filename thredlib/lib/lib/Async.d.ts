/**
 * Use these if your callbacks need to complete in the order submitted, synchronously
 */
export declare class Series {
    static forEach<T>(array: T[], callback: (item: T, index: number, array: T[]) => Promise<void>): Promise<void>;
    static map<S, T>(array: S[], callback: (item: S, index: number, array: S[]) => Promise<T>): Promise<T[]>;
    static filter<T>(array: T[], callback: (item: T, index: number, array: T[]) => Promise<boolean>): Promise<T[]>;
    static reduce<S, T>(array: S[], callback: (accumlator: any, item: S, index: number, array: S[]) => any, initialValue: any): Promise<T>;
    static some<T>(array: T[], callback: (item: T, index: number, array: T[]) => Promise<boolean>): Promise<boolean>;
}
/**
 * Use these if it doesn't matter what order your callbacks complete in
 */
export declare class Parallel {
    static forEach<T>(array: T[], callback: (item: T, index: number, array: T[]) => Promise<void>): Promise<void>;
    static map<S, T>(array: S[], callback: (item: S, index: number, array: S[]) => Promise<T>): Promise<T[]>;
    static filter<T>(array: T[], callback: (item: T, index: number, array: T[]) => Promise<boolean>): Promise<T[]>;
    static some<T>(array: T[], callback: (item: T, index: number, array: T[]) => Promise<boolean>): Promise<boolean>;
}
