import { ExpressionParams } from './Expression.js';
export declare const defaultBindings: (params: ExpressionParams) => {
    event: import("../index.js").Event;
    data: import("../index.js").EventData | undefined;
    advice: {
        eventType: string;
        title?: string;
        template?: import("../index.js").TemplateModel;
    } | undefined;
    content: import("../index.js").EventContent | undefined;
    values: Record<string, any> | Record<string, any>[] | undefined;
    valueNamed: (name: string) => any;
    local: (name: string) => any;
    setLocal: (name: string, value: any) => void;
};
