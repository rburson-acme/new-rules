import { Event, EventData, EventError, EventTask, InlineItem, Resource } from "./Event.js";
import { NewEventParams } from "./Events.js";
export declare class EventBuilder {
    private event;
    static create(params: NewEventParams): EventBuilder;
    constructor(params: NewEventParams);
    set(params: Partial<Event>): EventBuilder;
    merge(params: Partial<Event>): EventBuilder;
    mergeData(data: EventData): EventBuilder;
    mergeValues(values: Record<string, any> | Record<string, any>[]): EventBuilder;
    mergeTasks(tasks: EventTask | EventTask[]): EventBuilder;
    mergeResources(resources: Resource[]): EventBuilder;
    mergeInlineContent(items: InlineItem[]): EventBuilder;
    mergeError(error: EventError): EventBuilder;
    fork(): EventBuilder;
    build(): Event;
}
