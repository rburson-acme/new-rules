import { ExpressionParams } from './Expression.js';
export declare const defaultBindings: (params: ExpressionParams) => {
    event: import("../index.js").Event;
    data: import("../index.js").EventData | undefined;
    content: any;
    values: any;
    valueNamed: (name: string) => any;
    local: (name: string) => any;
    setLocal: (name: string, value: any) => void;
};
