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
    static getTasks(event: Event): EventContent['tasks'] | undefined;
    static getResources(event: Event): EventContent['resources'] | undefined;
    static getInlineContent(event: Event): EventContent['items'] | undefined;
    static getError(event: Event): EventContent['error'] | undefined;
    /**
     * Asserts that the event contains a single value and returns it.
     * This is either an array with one element or a single value.
     *
     * @param event - The event from which to extract the value.
     * @returns The single value contained in the event.
     * @throws Will throw an error if the event has no values or if it contains more than one value.
     */
    static assertSingleValues(event: Event): Record<string, any>;
    /**
     * Asserts that the values of the given event are an array.
     *
     * @param event - The event object to extract values from.
     * @returns An array of records containing the event values.
     * @throws Will throw an error if the event has no values or if the values are not an array.
     */
    static assertArrayValues(event: Event): Record<string, any>[];
    /**
     * Retrieves a value from an the event content by its name, at any depth.
     * The first value found with the specified name is returned.
     *
     * @param event - The event object from which to retrieve the value.
     * @param name - The name of the value to retrieve.
     * @returns The value associated with the specified name, or `undefined` if not found.
     */
    static valueNamed(event: Event, name: string): any;
    private static _valueNamed;
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
