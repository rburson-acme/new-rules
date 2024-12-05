import { EventError } from "./Event.js";
export declare class EventThrowable extends Error {
    readonly eventError: EventError['error'];
    static get(message: string, code?: number, cause?: any): EventThrowable;
    constructor(eventError: EventError['error']);
}
