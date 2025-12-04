import { Event } from '../core/Event.js';
import { ExpressionParams } from './Expression.js';
export declare const defaultBindings: (params: ExpressionParams) => {
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
};
