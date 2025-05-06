import { EventError, EventThrowable } from "../thredlib";
import { ThredContext } from "./ThredContext";

export class ThredThrowable extends EventThrowable {

     /**
   * Creates a new EventThrowable instance from an error object.
   * @param eventError - The EventError['error'] object containing the message and optional code and cause.
   * @param notifyScope - The participants to notify, either 'sender' or 'thred'. Note that thredContext is required for 'thred' scope
   * @param thredContext - The context of the Thred, if applicable.
  */
  static get(eventError: EventError['error'], notifyScope?: 'sender' | 'thred', thredContext?: ThredContext): EventThrowable {
    return new ThredThrowable(eventError, notifyScope, thredContext);
  }
  constructor(
    public readonly eventError: EventError['error'],
    public readonly notifyScope: 'sender' | 'thred' = 'sender',
    public readonly thredContext?: ThredContext,
  ) {
    super(eventError);
    this.name = "ThredThrowable";
  }
}
