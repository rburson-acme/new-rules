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
        advice: {
            eventType: string;
            title?: string;
            template?: import("../index.js").TemplateModel;
        } | undefined;
        content: import("../core/Event.js").EventContent | undefined;
        values: Record<string, any> | Record<string, any>[] | undefined;
        valueNamed: (name: string) => any;
        local: (name: string) => any;
        setLocal: (name: string, value: any) => void;
    };
}
