export class EventThrowable extends Error {
    eventError;
    static get(message, code, cause) {
        return new EventThrowable({ message, code, cause });
    }
    constructor(eventError) {
        const { message, cause } = eventError || {};
        super(message, { cause });
        this.eventError = eventError;
        this.name = 'EventError';
    }
}
