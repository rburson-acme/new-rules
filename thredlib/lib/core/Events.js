import { deepMerge } from '../lib/lib.js';
import { Logger } from '../lib/Logger.js';
import { Id } from './Id.js';
export class Events {
    // Event construction
    // type and source are required. id and time can be generated, if not present
    static newEvent(params) {
        const { id, type, source } = params;
        if (!type)
            throw new Error('Event type is required');
        if (!source)
            throw new Error('Event source is required');
        const { id: sourceId, name: sourceName, uri: sourceUri } = source;
        const _id = id || Id.nextEventId;
        const event = {
            ...params,
            id: _id,
            time: Date.now(),
            source: { id: sourceId, name: sourceName, uri: sourceUri },
        };
        return event;
    }
    static mergeEvent(params, event) {
        return deepMerge(event, params);
    }
    static mergeData(data, event) {
        return deepMerge(event, { data });
    }
    static mergeContent(content, event) {
        return deepMerge(event, { data: { content } });
    }
    static mergeValues(values, event) {
        return deepMerge(event, { data: { content: { values } } });
    }
    static mergeValuesType(valuesType, event) {
        return deepMerge(event, { data: { content: { valuesType } } });
    }
    static mergeTasks(tasks, event) {
        return deepMerge(event, { data: { content: { tasks: [tasks] } } });
    }
    static mergeResources(resources, event) {
        return deepMerge(event, { data: { content: { resources } } });
    }
    static mergeInlineContent(items, event) {
        return deepMerge(event, { data: { content: { items } } });
    }
    static mergeError(error, event) {
        return deepMerge(event, { data: { content: { error } } });
    }
    // Event data accessors
    static getData(event) {
        return event?.data;
    }
    static getAdvice(event) {
        return this.getData(event)?.advice;
    }
    static getContent(event) {
        return this.getData(event)?.content;
    }
    static getValues(event) {
        return this.getContent(event)?.values;
    }
    static getValuesType(event) {
        return this.getContent(event)?.valuesType;
    }
    static getTasks(event) {
        return this.getContent(event)?.tasks;
    }
    static getResources(event) {
        return this.getContent(event)?.resources;
    }
    static getInlineContent(event) {
        return this.getContent(event)?.items;
    }
    static getError(event) {
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
    static assertSingleValues(event) {
        const values = this.getValues(event);
        if (!values)
            throw new Error(`Event has no values`);
        if (Array.isArray(values)) {
            if (values.length > 1)
                throw new Error(`Event has more than one value`);
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
    static assertArrayValues(event) {
        const values = this.getValues(event);
        if (!values)
            throw new Error(`Event has no values`);
        if (!Array.isArray(values))
            throw new Error(`Event values is not an array`);
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
    static valueNamed(event, name) {
        const values = this.getValues(event);
        const result = this._valueNamed(values, name);
        if (!result)
            Logger.debug({ msg: Logger.h2(`Event value named ${name} not found`), thredId: event.thredId });
        return result;
    }
    static _valueNamed(value, name) {
        if (Array.isArray(value)) {
            for (const item of value) {
                const result = this._valueNamed(item, name);
                if (result)
                    return result;
            }
        }
        if (typeof value === 'object') {
            if (value?.[name])
                return value[name];
            for (const key in value) {
                const result = this._valueNamed(value[key], name);
                if (result)
                    return result;
            }
        }
    }
}
export class EventHelper {
    event;
    constructor(event) {
        this.event = event;
    }
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
    valueNamed(name) {
        return Events.valueNamed(this.event, name);
    }
}
