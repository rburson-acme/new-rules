export class EventThrowable extends Error {
    eventError;
    /**
     * Creates a new EventThrowable instance from an error object that conforms to the EventError['error'] interface.
     * @param eventError - The error object containing the message and optional code and cause.
     */
    static get(eventError) {
        return new EventThrowable(eventError);
    }
    constructor(eventError) {
        const { message, cause } = eventError || {};
        super(message, { cause });
        this.eventError = eventError;
        this.name = 'EventError';
    }
}
export function serializableError(error) {
    if (!error)
        return {};
    return {
        message: error.message,
        stack: error.stack,
        name: error.name,
        cause: serializableError(error.cause),
    };
}
