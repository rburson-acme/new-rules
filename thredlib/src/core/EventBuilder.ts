import { Event, EventContent, EventData, EventError, EventTask, InlineItem, Resource } from "./Event.js";
import { Events, NewEventParams } from "./Events.js";

export class EventBuilder {
    private event: NewEventParams;

    static create(params: NewEventParams): EventBuilder {
        return new EventBuilder(params);
    }

    constructor(params: NewEventParams) {
        this.event = params;
    }

    set(params: Partial<Event>): EventBuilder {
        this.event = { ...this.event, ...params };
        return this;
    }

    merge(params: Partial<Event>): EventBuilder {
        this.event = Events.mergeEvent(params, this.event) as NewEventParams;
        return this;
    }

    mergeData(data: EventData): EventBuilder {
        this.event = Events.mergeData(data, this.event) as NewEventParams;
        return this;
    }

    mergeContent(content: EventContent): EventBuilder {
        this.event = Events.mergeContent(content, this.event) as NewEventParams;
        return this;
    }   

    mergeValues(values: Record<string, any> | Record<string, any>[]): EventBuilder {
        this.event = Events.mergeValues(values, this.event) as NewEventParams;
        return this;
    }

    mergeValuesType(valuesType: string): EventBuilder {
        this.event = Events.mergeValuesType(valuesType, this.event) as NewEventParams;
        return this;
    }

    mergeTasks(tasks: EventTask | EventTask[]): EventBuilder {
        this.event = Events.mergeTasks(tasks, this.event) as NewEventParams;
        return this;
    }

    mergeResources(resources: Resource[]): EventBuilder {
        this.event = Events.mergeResources(resources, this.event) as NewEventParams;
        return this;
    }

    mergeInlineContent(items: InlineItem[]): EventBuilder {
        this.event = Events.mergeInlineContent(items, this.event) as NewEventParams;
        return this;
    }

    mergeError(error: EventError): EventBuilder {
        this.event = Events.mergeError(error, this.event) as NewEventParams;
        return this;
    }

    fork(): EventBuilder {
        return new EventBuilder(structuredClone(this.event));   
    }

    build(): Event {
        return Events.newEvent(this.event);
    }
}