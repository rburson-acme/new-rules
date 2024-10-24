import { EventContent, Event, EventData } from './Event.js';
export interface EventParams {
    id: string;
    type: string;
    title?: string;
    description?: string;
    contentType?: string;
    source: Event['source'];
    thredId?: string;
    content?: any;
}
export declare class Events {
    static newEvent(params: EventParams): Event;
    static getData(event: Event): EventData | undefined;
    static getAdvice(event: Event): EventData['advice'] | undefined;
    static getContent(event: Event): EventContent | undefined;
    static getValues(event: Event): EventContent['values'] | undefined;
    static valueNamed(event: Event, name: string): any;
}
export declare class EventHelper {
    readonly event: Event;
    constructor(event: Event);
    getData(): EventData | undefined;
    getAdvice(): {
        eventType: string;
        title?: string;
        template?: import("../index.js").TemplateModel;
    } | undefined;
    getContent(): EventContent | undefined;
    getValues(): Record<string, any> | Record<string, any>[] | undefined;
    valueNamed(name: string): any;
}
