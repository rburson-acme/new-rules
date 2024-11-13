import { Events } from "./Events.js";
export class EventBuilder {
    event;
    static create(params) {
        return new EventBuilder(params);
    }
    constructor(params) {
        this.event = params;
    }
    set(params) {
        this.event = { ...this.event, ...params };
        return this;
    }
    merge(params) {
        this.event = Events.mergeEvent(params, this.event);
        return this;
    }
    mergeData(data) {
        this.event = Events.mergeData(data, this.event);
        return this;
    }
    mergeValues(values) {
        this.event = Events.mergeValues(values, this.event);
        return this;
    }
    mergeTasks(tasks) {
        this.event = Events.mergeTasks(tasks, this.event);
        return this;
    }
    mergeResources(resources) {
        this.event = Events.mergeResources(resources, this.event);
        return this;
    }
    mergeInlineContent(items) {
        this.event = Events.mergeInlineContent(items, this.event);
        return this;
    }
    mergeError(error) {
        this.event = Events.mergeError(error, this.event);
        return this;
    }
    fork() {
        return new EventBuilder(structuredClone(this.event));
    }
    build() {
        return Events.newEvent(this.event);
    }
}
