import { EventError } from './Event.js';

export class EventThrowable extends Error {
  /**
   * Creates a new EventThrowable instance from an error object that conforms to the EventError['error'] interface.
   * @param eventError - The error object containing the message and optional code and cause.
   */
  static get(eventError: EventError['error']): EventThrowable {
    return new EventThrowable(eventError);
  }
  constructor(public readonly eventError: EventError['error']) {
    const { message, cause } = eventError || {};
    super(message, { cause });
    this.name = 'EventError';
  }

}
  
export function serializableError(error: any): { message?: string; stack?: string; name?: string; cause?: any } {
    if (!error) return {};
    return {
      message: error.message,
      stack: error.stack,
      name: error.name,
      cause: serializableError(error.cause),
    };
  }
