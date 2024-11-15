import { EventContent, Event, EventData, EventTask, Resource, InlineItem, EventError } from './Event.js';
export type NewEventParams = Partial<Event> & Pick<Event, 'type' | 'source'>;
export declare class Events {
    static newEvent(params: NewEventParams): Event;
    static mergeEvent(params: Partial<Event>, event: Partial<Event>): Partial<Event>;
    static mergeData(data: EventData, event: Partial<Event>): Partial<Event>;
    static mergeValues(values: Record<string, any> | Record<string, any>[], event: Partial<Event>): Partial<Event>;
    static mergeTasks(tasks: EventTask | EventTask[], event: Partial<Event>): Partial<Event>;
    static mergeResources(resources: Resource[], event: Partial<Event>): Partial<Event>;
    static mergeInlineContent(items: InlineItem[], event: Partial<Event>): Partial<Event>;
    static mergeError(error: EventError, event: Partial<Event>): Partial<Event>;
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
