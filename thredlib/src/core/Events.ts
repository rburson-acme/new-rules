import { deepMerge } from '../lib/lib.js';
import { Logger } from '../lib/Logger.js';
import { EventContent, Event, EventData, EventTask, Resource, InlineItem, EventError } from './Event.js';
import { Id } from './Id.js';

export type NewEventParams = Partial<Event> & Pick<Event, 'type' | 'source'>;

export class Events {
  // Event construction

  // type and source are required. id and time can be generated, if not present
  static newEvent(params: NewEventParams): Event {
    const { id, type, source } = params;
    if (!type) throw new Error('Event type is required');
    if (!source) throw new Error('Event source is required');
    const { id: sourceId, name: sourceName, uri: sourceUri } = source;
    const _id = id || Id.nextEventId;
    const event: Event = {
      ...params,
      id: _id,
      time: Date.now(),
      source: { id: sourceId, name: sourceName, uri: sourceUri },
    };
    return event;
  }

  static mergeEvent(params: Partial<Event>, event: Partial<Event>): Partial<Event> {
    return deepMerge(event, params) as Event;
  }

  static mergeData(data: EventData, event: Partial<Event>): Partial<Event> {
    return deepMerge(event, { data });
  }

  static mergeContent(content: EventContent, event: Partial<Event>): Partial<Event> {
    return deepMerge(event, { data: { content } });
  }

  static mergeValues(values: Record<string, any> | Record<string, any>[], event: Partial<Event>): Partial<Event> {
    return deepMerge(event, { data: { content: { values } } });
  }
  
  static mergeValuesType(valuesType: string, event: Partial<Event>): Partial<Event> {
    return deepMerge(event, { data: { content: { valuesType } } });
  }

  static mergeTasks(tasks: EventTask | EventTask[], event: Partial<Event>): Partial<Event> {
    return deepMerge(event, { data: { content: { tasks: [tasks] } } });
  }

  static mergeResources(resources: Resource[], event: Partial<Event>): Partial<Event> {
    return deepMerge(event, { data: { content: { resources } } });
  }

  static mergeInlineContent(items: InlineItem[], event: Partial<Event>): Partial<Event> {
    return deepMerge(event, { data: { content: { items } } });
  }

  static mergeError(error: EventError, event: Partial<Event>): Partial<Event> {
    return deepMerge(event, { data: { content: { error } } });
  }

  // Event data accessors

  static getData(event: Event): EventData | undefined {
    return event?.data;
  }

  static getAdvice(event: Event): EventData['advice'] | undefined {
    return this.getData(event)?.advice;
  }

  static getContent(event: Event): EventContent | undefined {
    return this.getData(event)?.content;
  }

  static getValues(event: Event): EventContent['values'] | undefined {
    return this.getContent(event)?.values;
  }

  static getValuesType(event: Event): EventContent['valuesType'] | undefined {
    return this.getContent(event)?.valuesType;
  }

  static getTasks(event: Event): EventContent['tasks'] | undefined {
    return this.getContent(event)?.tasks;
  }

  static getResources(event: Event): EventContent['resources'] | undefined {
    return this.getContent(event)?.resources;
  }

  static getInlineContent(event: Event): EventContent['items'] | undefined {
    return this.getContent(event)?.items;
  }

  static getError(event: Event): EventContent['error'] | undefined {
    return this.getContent(event)?.error;
  }

  /**
   * Asserts that the event contains a single value and returns it.
   * This is either an array with one element or a single value.
   *
   * @param event - The event from which to extract the value.
   * @returns The single value contained in the event.
   * @throws Will throw an error if the event has no values or if it contains more than one value.
   */
  static assertSingleValues(event: Event): Record<string, any> {
    const values = this.getValues(event);
    if (!values) throw new Error(`Event has no values`);
    if (Array.isArray(values)) {
      if (values.length > 1) throw new Error(`Event has more than one value`);
      return values[0];
    }
    return values;
  }

  /**
   * Asserts that the values of the given event are an array.
   *
   * @param event - The event object to extract values from.
   * @returns An array of records containing the event values.
   * @throws Will throw an error if the event has no values or if the values are not an array.
   */
  static assertArrayValues(event: Event): Record<string, any>[] {
    const values = this.getValues(event);
    if (!values) throw new Error(`Event has no values`);
    if (!Array.isArray(values)) throw new Error(`Event values is not an array`);
    return values;
  }

  /**
   * Retrieves a value from an the event content by its name, at any depth.
   * The first value found with the specified name is returned.
   *
   * @param event - The event object from which to retrieve the value.
   * @param name - The name of the value to retrieve.
   * @returns The value associated with the specified name, or `undefined` if not found.
   */
  static valueNamed(event: Event, name: string) {
    const values = this.getValues(event);
    const result = this._valueNamed(values, name);
    if (!result) Logger.debug(Logger.h2(`Event value named ${name} not found`));
    return result;
  }

  private static _valueNamed(value: any, name: string): any {
    if (Array.isArray(value)) {
      for (const item of value) {
        const result = this._valueNamed(item, name);
        if (result) return result;
      }
    }
    if (typeof value === 'object') {
      if (value?.[name]) return value[name];
      for (const key in value) {
        const result = this._valueNamed(value[key], name);
        if(result) return result;
      }
    }
  }
}

export class EventHelper {
  constructor(readonly event: Event) {}
  getData() {
    return Events.getData(this.event);
  }
  getAdvice() {
    return Events.getAdvice(this.event);
  }
  getContent() {
    return Events.getContent(this.event);
  }
  getValues() {
    return Events.getValues(this.event);
  }
  valueNamed(name: string) {
    return Events.valueNamed(this.event, name);
  }
}
