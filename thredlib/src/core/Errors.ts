import { EventError } from "./Event.js";

export class EventThrowable extends Error {

  static get(message: string, code?: number, cause?: any): EventThrowable {
    return new EventThrowable({ message, code, cause });
  }
  constructor(public readonly eventError: EventError['error']) {
    const { message, cause } = eventError || {};
    super(message, { cause });
    this.name = 'EventError';
  }
}