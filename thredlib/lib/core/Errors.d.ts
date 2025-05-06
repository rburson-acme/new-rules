import { EventError } from './Event.js';
export declare class EventThrowable extends Error {
    readonly eventError: EventError['error'];
    /**
     * Creates a new EventThrowable instance from an error object that conforms to the EventError['error'] interface.
     * @param eventError - The error object containing the message and optional code and cause.
     */
    static get(eventError: EventError['error']): EventThrowable;
    constructor(eventError: EventError['error']);
}
export declare function serializableError(error: any): {
    message?: string;
    stack?: string;
    name?: string;
    cause?: any;
};
