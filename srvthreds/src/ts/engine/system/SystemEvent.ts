import {
  Event,
  eventTypes,
  Events,
  StringMap,
  systemEventTypes,
  Address,
  Logger,
  ThredId,
  SystemEvents,
  TransitionModel,
} from '../../thredlib/index.js';
import { ThredStore } from '../store/ThredStore.js';
import { Threds } from '../Threds.js';
import { ThredCompanion } from '../Thred.js';
import { Transition } from '../Transition.js';
import { Id } from '../Id.js';

export interface SystemEventArgs {
  readonly event: Event;
  readonly threds: Threds;
}

export interface SystemThredEventArgs {
  readonly event: Event;
  readonly threds: Threds;
  readonly thredStore: ThredStore;
  readonly thredCompanion: ThredCompanion;
}
export interface SystemEventValues {
  readonly op?: string;
  reactionName?: string;
  transition?: TransitionModel;
  patternId?: string;
  scope?: string;
  delay?: number;
}

/*
    Thred related operations
    These operations perform thred state changes so are therefore are all synchronous
*/
export class SystemThredEvent {
  private static operations: StringMap<(args: SystemThredEventArgs) => Promise<void>> = {
    [systemEventTypes.operations.timeoutReaction]:
      SystemThredEvent.timeoutReaction,
    [systemEventTypes.operations.transitionThred]:
      SystemThredEvent.transitionThred,
    [systemEventTypes.operations.terminateThred]:
      SystemThredEvent.terminateThred,
  };

  //@TODO authenticate sender source (up channel) so this is secure
  static isSystemThredEvent(event: Event): boolean {
    return event.type === eventTypes.control.thredControl.type;
  }

  static thredDoesNotExist(threds: Threds, event: Event) {
    const to = [event.source.id];
    const thredId = event.thredId || '<none>';
    const opName = (Events.getContent(event)?.values as SystemEventValues)
      ?.op;
    if (!opName) {
      Logger.error(
        `No operation name supplied for threadDoesNotExist() on Thred ${thredId}`
      );
      return;
    }
    dispatch(
      threds,
      to,
      Id.nextEventId,
      thredId,
      opName,
      systemEventTypes.unsuccessfulStatus,
      `Thred ${thredId} does not exist for ${opName} operation`
    );
  }

  static async handleSystemThredEvent(args: SystemThredEventArgs): Promise<void> {
    const { thredStore, threds, event } = args;
    const { id: thredId } = thredStore;
    const to = [event.source.id];
    const opName = (Events.getContent(event)?.values as SystemEventValues)
      ?.op;
    if (!opName) {
      Logger.error(
        `No operation name supplied for system thread event on Thred ${thredId}`
      );
      return;
    }
    const operation = SystemThredEvent.operations[opName];
    let status,
      message = '';
    if (!operation) {
      status = systemEventTypes.unsuccessfulStatus;
      message = `No operation found called ${opName} for Thred ${thredId}`;
    } else {
      try {
        await operation(args);
        status = systemEventTypes.successfulStatus;
        message = `Operation ${opName} successful for Thred ${thredId}`;
      } catch (e) {
        Logger.error(e);
        status = systemEventTypes.unsuccessfulStatus;
        message = `Operation ${opName} failed for Thred ${thredId}`;
      }
    }
    dispatch(threds, to, Id.nextEventId, thredId, opName, status, message);
  }

  /*
        Timout the reaction if reactionName is the current reaction
    */
  private static async timeoutReaction(args: SystemThredEventArgs): Promise<void> {
    const { event, thredStore, threds, thredCompanion } = args;
    const reactionName = (
      Events.getContent(event)?.values as SystemEventValues
    )?.reactionName;
    if (thredStore.reactionStore.reactionName === reactionName) {
      await thredCompanion.timeoutReaction(thredStore, threds);
    }
  }

  /*
        Move the thred to give state
    */
  private static async transitionThred(args: SystemThredEventArgs): Promise<void> {
    const { event, thredStore, threds, thredCompanion } = args;
    const transitionModel = (
      Events.getContent(event)?.values as SystemEventValues
    )?.transition;
    if (transitionModel) {
      const transition = new Transition(transitionModel);
      await thredCompanion.transition(thredStore, threds, transition);
    }
  }

  /*
        Terminate the thred
    */
  private static async terminateThred(args: SystemThredEventArgs): Promise<void> {
    const { thredStore, thredCompanion } = args;
    await thredCompanion.terminateThred(thredStore);
  }
}

/*
    System level operations
*/
export class SystemEvent {
  private static operations: StringMap<
    (args: SystemEventArgs) => Promise<void>
  > = {
    [systemEventTypes.operations.resetPattern]: SystemEvent.resetPattern,
    [systemEventTypes.operations.terminateAllThreds]:
      SystemEvent.terminateAllThreds,
    [systemEventTypes.operations.shutdown]: SystemEvent.shutdown,
  };

  //@TODO authenticate sender source (up channel) so this is secure
  static isSystemEvent(event: Event): boolean {
    return (
      event.type === eventTypes.control.sysControl.type
    );
  }

  static async handleSystemEvent(args: SystemEventArgs): Promise<void> {
    const { threds, event } = args;
    const opName = (Events.getContent(event)?.values as SystemEventValues)
      ?.op;
    if (!opName) {
      Logger.error(
        `No operation name supplied for handleSystemEvent() with event ${event.id}`
      );
      return;
    }
    const operation = SystemEvent.operations[opName];
    const to = [event.source.id];
    let status,
      message = '';
    if (!operation) {
      status = systemEventTypes.unsuccessfulStatus;
      message = `No operation found called ${opName} for System operation`;
    } else {
      try {
        await operation(args);
        status = systemEventTypes.successfulStatus;
        message = `Operation ${opName} successful for System operation`;
      } catch (e) {
        Logger.error(e);
        status = systemEventTypes.unsuccessfulStatus;
        message = `Operation ${opName} failed for System operation`;
      }
    }
    dispatch(
      threds,
      to,
      Id.nextEventId,
      ThredId.SYSTEM,
      opName,
      status,
      message
    );
  }

  private static async resetPattern(args: SystemEventArgs): Promise<void> {
    const { event, threds } = args;
    const patternId = (Events.getContent(event)?.values as SystemEventValues)?.patternId;

    if (!patternId){
         Logger.error(`No patternId supplied for resetPattern operation on System`);
        return undefined;
    }
    return threds.thredsStore.resetPatternStore(patternId);
  }

  private static terminateAllThreds(args: SystemEventArgs): Promise<void> {
    const { event, threds } = args;
    const scope = (Events.getContent(event)?.values as SystemEventValues)?.scope;
    return threds.terminateAllThreds();
  }

  private static shutdown(args: SystemEventArgs): Promise<void> {
    const { event, threds } = args;
    const delayMillis = (Events.getContent(event)?.values as SystemEventValues)?.delay;
    return threds.shutdown(delayMillis);
  }
}

const dispatch = (
  threds: Threds,
  to: string[] | Address,
  id: string,
  thredId: string,
  operation: string,
  status: string,
  message: string,
  code?: string
) => {
  try {
    const event: Event = getSystemStatusEvent(
      id,
      thredId,
      operation,
      status,
      message,
      code
    );
    threds.dispatch({ id: event.id, event, to });
  } catch (e) {
    Logger.error(
      `Failed to dispatch system event for operation ${operation}`,
      e
    );
  }
};

const getSystemStatusEvent = (
  id: string,
  thredId: string = ThredId.SYSTEM,
  operation: string,
  status: string,
  message?: string,
  code?: string
) => {
  return Events.newEvent({
    id,
    type: eventTypes.control.sysControl.type,
    thredId,
    source: { id: eventTypes.system.source.id },
    content: {
      type: systemEventTypes.responseTypes.opStatus,
      values: {
        operation,
        status,
        message,
        code,
      },
    },
  });
};
