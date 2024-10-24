import { ExpressionParams } from './Expression.js';
export declare const defaultBindings: (params: ExpressionParams) => {
    event: import("../index.js").Event;
    data: import("../index.js").EventData | undefined;
    content: import("../index.js").EventContent | undefined;
    values: void;
    valueNamed: (name: string) => undefined;
    local: (name: string) => any;
    setLocal: (name: string, value: any) => void;
};
