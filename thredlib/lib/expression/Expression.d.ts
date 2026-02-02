import { Event } from '../core/Event.js';
import { ExpressionContext } from './ExpressionContext.js';
export type ExpressionParams = {
    event: Event;
    context: ExpressionContext;
};
export declare class Expression {
    private readonly expression;
    constructor(expr: string);
    apply(params: ExpressionParams, bindings?: Record<string, any>): Promise<any>;
    bindingSetup(bindings: Record<string, any>, params: ExpressionParams): {
        event: Event;
        thredId: string | undefined;
        advice: {
            eventType: string;
            title?: string;
            template?: import("../index.js").TemplateModel;
        } | undefined;
        content: import("../core/Event.js").EventContent | undefined;
        data: import("../core/Event.js").EventData | undefined;
        values: Record<string, any> | Record<string, any>[] | undefined;
        valueNamed: (name: string, _event?: Event) => any;
        local: (name: string) => any;
        setLocal: (name: string, value: any) => void;
        isResponseFor: (transformName: string) => boolean;
        log: (msg: string) => void;
    };
}
