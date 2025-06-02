import { EventThrowable } from '../thredlib/core/Errors.js';
import {
  errorCodes,
  errorKeys,
  Event,
  Events,
  eventTypes,
  EventValues,
  StringMap,
  SystemEventInputValues,
  SystemEventThredInputValues,
} from '../thredlib/index.js';

export interface SystemServiceArgs {
  readonly event: Event;
}

export class SystemService {
  static async handleSystemEvent(
    args: SystemServiceArgs,
    operations: StringMap<(args: SystemServiceArgs) => Promise<EventValues['values']>>,
  ): Promise<EventValues['values']> {
    const { event } = args;
    const to = [event.source.id];
    const opName = (Events.getContent(event)?.values as SystemEventInputValues)?.op;
    if (!opName) {
      throw EventThrowable.get({
        message: `No operation name supplied for system event`,
        code: errorCodes[errorKeys.MISSING_ARGUMENT_ERROR].code,
      });
    }
    const operation = operations[opName];
    if (!operation) {
      throw EventThrowable.get({
        message: `No operation found called ${opName} for system event`,
        code: errorCodes[errorKeys.ARGUMENT_VALIDATION_ERROR].code,
      });
    } else {
      try {
        return await operation(args);
      } catch (e) {
        if (e instanceof EventThrowable) throw e;
        throw EventThrowable.get({
          message: `Operation ${opName} failed for system event`,
          code: errorCodes[errorKeys.SERVER_ERROR].code,
          cause: e,
        });
      }
    }
  }

  static isSystemEvent(event: Event): boolean {
    return (
      event.type === eventTypes.control.sysControl.type ||
      event.type === eventTypes.control.userControl.type ||
      event.type === eventTypes.control.dataControl.type
    );
  }
  //@TODO authenticate sender source (up channel) so this is secure
  static isAdminEvent(event: Event): boolean {
    return (
      event.type === eventTypes.control.sysControl.type ||
      event.type === eventTypes.control.dataControl.type
    );
  }

  static getArgs<T extends SystemEventInputValues>(args: SystemServiceArgs): { event: Event; args: T } {
    const { event } = args;
    return { event, args: Events.getValues(event) as T };
  }

  static getThredArgs<T extends SystemEventThredInputValues>(args: SystemServiceArgs): { event: Event; args: T } {
    const { event } = args;
    const { thredId, ...rest } = Events.getValues(event) as T;
    if (!thredId) {
      throw EventThrowable.get({
        message: `No thredId supplied for terminateThred operation on System`,
        code: errorCodes[errorKeys.MISSING_ARGUMENT_ERROR].code,
      });
    }
    return { event, args: { thredId, ...rest } as T };
  }
}
