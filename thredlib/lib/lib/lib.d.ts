export interface Identifiable {
    id: string | number;
}
export declare const nullish: (value: any) => boolean;
export declare const remove: (array: any[], item: any, equals?: (item1: any, item2: any) => boolean) => any[];
export declare const addUnique: (array: any[], item: any, equals?: (item1: any, item2: any) => boolean) => void;
export declare const removeById: (array: Identifiable[] | string[], item: Identifiable | string) => any[];
export declare const addUniqueById: (array: Identifiable[] | string[], item: Identifiable | string) => void;
