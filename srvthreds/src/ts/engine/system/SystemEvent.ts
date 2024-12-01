import {
  Event,
  eventTypes,
  Events,
  StringMap,
  systemEventTypes,
  Address,
  Logger,
  ThredId,
  SystemEventInputValues,
  EventBuilder,
  systemAddress,
} from '../../thredlib/index.js';
import { ThredStore } from '../store/ThredStore.js';
import { Threds } from '../Threds.js';
import { ThredCompanion } from '../Thred.js';
import { Transition } from '../Transition.js';
import { Id } from '../../thredlib/core/Id.js';

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

/*
    Thred related operations
    These operations perform thred state changes so are therefore are all synchronous
*/
export class SystemThredEvent {
  private static operations: StringMap<(args: SystemThredEventArgs) => Promise<void>> = {
    [systemEventTypes.operations.expireReaction]: SystemThredEvent.expireReaction,
    [systemEventTypes.operations.transitionThred]: SystemThredEvent.transitionThred,
    [systemEventTypes.operations.terminateThred]: SystemThredEvent.terminateThred,
  };

  //@TODO authenticate sender source (up channel) so this is secure
  static isSystemThredEvent(event: Event): boolean {
    return event.type === eventTypes.control.thredControl.type;
  }

  static thredDoesNotExist(threds: Threds, event: Event) {
    const to = [event.source.id];
    const thredId = event.thredId || '<none>';
    const opName = (Events.getContent(event)?.values as SystemEventInputValues)?.op;
    if (!opName) {
      Logger.error(`No operation name supplied for threadDoesNotExist() on Thred ${thredId}`);
      return;
    }

    dispatchStatusEvent({
      threds,
      to,
      id: Id.nextEventId,
      thredId,
      re: event.id,
      operation: opName,
      status: systemEventTypes.unsuccessfulStatus,
      message: `Thred ${thredId} does not exist for ${opName} operation`,
    });
  }

  static async handleSystemThredEvent(args: SystemThredEventArgs): Promise<void> {
    const { thredStore, threds, event } = args;
    const { id: thredId } = thredStore;
    const to = [event.source.id];
    const opName = (Events.getContent(event)?.values as SystemEventInputValues)?.op;
    if (!opName) {
      Logger.error(`No operation name supplied for system thread event on Thred ${thredId}`);
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
    dispatchStatusEvent({
      threds,
      to,
      id: Id.nextEventId,
      thredId,
      re: event.id,
      operation: opName,
      status,
      message,
    });
  }

  /*
        Expire the reaction if reactionName is the current reaction
    */
  private static async expireReaction(args: SystemThredEventArgs): Promise<void> {
    const { event, thredStore, threds, thredCompanion } = args;
    const reactionName = (Events.getContent(event)?.values as SystemEventInputValues)?.reactionName;
    if (thredStore.reactionStore.reactionName === reactionName) {
      await thredCompanion.expireReaction(thredStore, threds);
    }
  }

  /*
        Move the thred to give state
    */
  private static async transitionThred(args: SystemThredEventArgs): Promise<void> {
    const { event, thredStore, threds, thredCompanion } = args;
    const transitionModel = (Events.getContent(event)?.values as SystemEventInputValues)?.transition;
    if (transitionModel) {
      const transition = new Transition(transitionModel);
      await thredCompanion.transition(thredStore, threds, transition);
    }
  }

  /*
        Terminate the thred
    */
  static async terminateThred(args: SystemThredEventArgs): Promise<void> {
    const { thredStore, thredCompanion } = args;
    await thredCompanion.terminateThred(thredStore);
  }
}

/*
    System level operations
*/
export class SystemEvent {
  private static operations: StringMap<(args: SystemEventArgs) => Promise<void>> = {
    [systemEventTypes.operations.resetPattern]: SystemEvent.resetPattern,
    [systemEventTypes.operations.savePattern]: SystemEvent.savePattern,
    [systemEventTypes.operations.terminateAllThreds]: SystemEvent.terminateAllThreds,
    [systemEventTypes.operations.shutdown]: SystemEvent.shutdown,
  };

  //@TODO authenticate sender source (up channel) so this is secure
  static isSystemEvent(event: Event): boolean {
    return event.type === eventTypes.control.sysControl.type;
  }

  static async handleSystemEvent(args: SystemEventArgs): Promise<void> {
    const { threds, event } = args;
    const opName = (Events.getContent(event)?.values as SystemEventInputValues)?.op;
    if (!opName) {
      Logger.error(`No operation name supplied for handleSystemEvent() with event ${event.id}`);
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
    dispatchStatusEvent({
      threds,
      to,
      id: Id.nextEventId,
      thredId: ThredId.SYSTEM,
      re: event.id,
      operation: opName,
      status,
      message,
    });
  }

  private static async resetPattern(args: SystemEventArgs): Promise<void> {
    const { event, threds } = args;
    const patternId = (Events.getContent(event)?.values as SystemEventInputValues)?.patternId;
    if (!patternId) {
      Logger.error(`No patternId supplied for resetPattern operation on System`);
      return undefined;
    }
    return threds.thredsStore.resetPatternStore(patternId);
  }

  private static async savePattern(args: SystemEventArgs): Promise<void> {
    const { event, threds } = args;
    const patternModel = (Events.getContent(event)?.values as SystemEventInputValues)?.patternModel;
    if (!patternModel?.id) {
      Logger.error(`No pattern or pattern with id supplied for resetPattern operation on System`);
      return undefined;
    }
    const storePatternEvent = EventBuilder.create(eventTypes.system)
      .fork()
      .mergeTasks({ op: 'create', params: { type: 'PatternModel', values: patternModel } })
      .mergeData({ title: 'Store Pattern' })
      .build();
      threds.dispatch({ id: storePatternEvent.id, event: storePatternEvent, to: [systemAddress.persistence] });
  }

  private static terminateAllThreds(args: SystemEventArgs): Promise<void> {
    const { event, threds } = args;
    const scope = (Events.getContent(event)?.values as SystemEventInputValues)?.scope;
    return threds.terminateAllThreds();
  }

  private static shutdown(args: SystemEventArgs): Promise<void> {
    const { event, threds } = args;
    const delayMillis = (Events.getContent(event)?.values as SystemEventInputValues)?.delay;
    return threds.shutdown(delayMillis);
  }
}

const dispatchStatusEvent = ({
  threds,
  to,
  id,
  thredId,
  operation,
  status,
  message,
  code,
  re,
}: {
  threds: Threds;
  to: string[] | Address;
  id: string;
  thredId: string;
  operation: string;
  status: string;
  message: string;
  code?: string;
  re?: string;
}) => {
  try {
    const event: Event = getSystemStatusEvent(id, thredId, operation, status, message, code, re);
    threds.dispatch({ id: event.id, event, to });
  } catch (e) {
    Logger.error(`Failed to dispatch system event for operation ${operation}`, e);
  }
};

const getSystemStatusEvent = (
  id: string,
  thredId: string = ThredId.SYSTEM,
  operation: string,
  status: string,
  message?: string,
  code?: string,
  re?: string,
) => {
  return Events.newEvent({
    id,
    type: eventTypes.control.sysControl.type,
    thredId,
    source: { id: eventTypes.system.source.id },
    re,
    data: {
      content: {
        values: {
          operation,
          status,
          message,
          code,
        },
      },
    },
  });
};
