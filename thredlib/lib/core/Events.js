import { deepMerge } from '../lib/lib.js';
import { Logger } from '../lib/Logger.js';
import { Id } from './Id.js';
export class Events {
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
    static mergeValues(values, event) {
        return deepMerge(event, { data: { content: { values } } });
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
    static valueNamed(event, name) {
        const values = this.getValues(event);
        if (Array.isArray(values)) {
            return values.find((value) => value[name]);
        }
        if (!values?.[name])
            Logger.info(`Event value named ${name} not found`);
        return values?.[name];
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
