import { Event } from '../core/Event.js';
import { ExpressionContext } from './ExpressionContext.js';
export type ExpressionParams = {
    event: Event;
    context: ExpressionContext;
};
export declare class Expression {
    private readonly expression;
    constructor(expr: string);
    apply(params: ExpressionParams, bindings?: Record<string, string>): Promise<any>;
    bindingSetup(bindings: Record<string, string>, params: ExpressionParams): {
        event: Event;
        data: import("../core/Event.js").EventData | undefined;
        content: import("../core/Event.js").EventContent | undefined;
        values: void;
        valueNamed: (name: string) => undefined;
        local: (name: string) => any;
        setLocal: (name: string, value: any) => void;
    };
}
