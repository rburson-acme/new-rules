import {
  Event,
  eventTypes,
  Events,
  StringMap,
  systemEventTypes,
  Logger,
  SystemEventInputValues,
  errorKeys,
  errorCodes,
  EventValues,
  TerminateThreadArgs,
  SystemEventThredInputValues,
  GetThredsArgs,
  TransitionThredArgs,
} from '../thredlib/index.js';
import { EventThrowable } from '../thredlib/core/Errors.js';
import { ThredsStore } from '../engine/store/ThredsStore.js';
import { Thred } from '../engine/Thred.js';
import { Threds } from '../engine/Threds.js';

export interface AdminServiceArgs {
  readonly event: Event;
}

/*
    Thred related operations
    These operations perform thred state changes so are therefore are all synchronous
*/
export class AdminService {
  constructor(private threds: Threds) {}

  //@TODO authenticate sender source (up channel) so this is secure
  static isSystemEvent(event: Event): boolean {
    return event.type === eventTypes.control.sysControl.type || event.type === eventTypes.control.dataControl.type;
  }

  async handleSystemEvent(args: AdminServiceArgs): Promise<EventValues['values']> {
    const { event } = args;
    const to = [event.source.id];
    const opName = (Events.getContent(event)?.values as SystemEventInputValues)?.op;
    if (!opName) {
      throw EventThrowable.get(
        `No operation name supplied for system event`,
        errorCodes[errorKeys.MISSING_ARGUMENT_ERROR].code,
      );
    }
    const operation = this.operations[opName];
    if (!operation) {
      throw EventThrowable.get(
        `No operation found called ${opName} for system event`,
        errorCodes[errorKeys.ARGUMENT_VALIDATION_ERROR].code,
      );
    } else {
      try {
        return await operation(args);
      } catch (e) {
        if (e instanceof EventThrowable) throw e;
        throw EventThrowable.get(
          `Operation ${opName} failed for system event`,
          errorCodes[errorKeys.SERVER_ERROR].code,
          e,
        );
      }
    }
  }
  /*
        Expire the reaction if reactionName is the current reaction
    */
  expireReaction = async (args: AdminServiceArgs): Promise<void> => {
    /*const { event, thredStore, threds, thredCompanion } = args;
    const reactionName = (Events.getContent(event)?.values as SystemEventValues)?.reactionName;
    if (thredStore.reactionStore.reactionName === reactionName) {
      await thredCompanion.expireReaction(thredStore, threds);
    }*/
  };

  /*
        Move the thred to the given state
    */
  transitionThred = async (args: AdminServiceArgs): Promise<EventValues['values']> => {
    const {
      event,
      args: { thredId, op, transition },
    } = this.getThredArgs<TransitionThredArgs>(args);
    await this.threds.thredsStore.withThredStore(thredId, async (thredStore) => {
      Thred.transition();
    });
    return { status: systemEventTypes.successfulStatus, op, thredId };
  };

  getThreds = async (args: AdminServiceArgs): Promise<EventValues['values']> => {
    const {
      event,
      args: { op, thredIds },
    } = this.getArgs<GetThredsArgs>(args);
    const thredStores = await (thredIds?.length
      ? this.threds.thredsStore.getThredStores(thredIds!)
      : this.threds.thredsStore.getAllThredStores());
    return { status: systemEventTypes.successfulStatus, op, thredStores };
  };

  /*
        Terminate the thred
    */
  terminateThred = async (args: AdminServiceArgs): Promise<EventValues['values']> => {
    const {
      event,
      args: { thredId, op },
    } = this.getThredArgs<TerminateThreadArgs>(args);
    await this.threds.thredsStore.withThredStore(thredId, async (thredStore) => {
      thredStore.finish();
    });
    return { status: systemEventTypes.successfulStatus, op, thredId };
  };

  private getArgs<T extends SystemEventInputValues>(args: AdminServiceArgs): { event: Event; args: T } {
    const { event } = args;
    return { event, args: Events.getValues(event) as T };
  }

  private getThredArgs<T extends SystemEventThredInputValues>(args: AdminServiceArgs): { event: Event; args: T } {
    const { event } = args;
    const { thredId, ...rest } = Events.getValues(event) as T;
    if (!thredId) {
      throw EventThrowable.get(
        `No thredId supplied for terminateThred operation on System`,
        errorCodes[errorKeys.MISSING_ARGUMENT_ERROR].code,
      );
    }
    return { event, args: { thredId, ...rest } as T };
  }

  resetPattern = async (args: AdminServiceArgs): Promise<void> => {
    /*const { event, threds } = args;
    const patternId = (Events.getContent(event)?.values as SystemEventValues)?.patternId;
    if (!patternId) {
      Logger.error(`No patternId supplied for resetPattern operation on System`);
      return undefined;
    }
    return threds.thredsStore.resetPatternStore(patternId);
    */
  };

  terminateAllThreds = async (args: AdminServiceArgs): Promise<void> => {
    /*const { event, threds } = args;
    const scope = (Events.getContent(event)?.values as SystemEventValues)?.scope;
    return threds.terminateAllThreds();*/
  };

  shutdown = async (args: AdminServiceArgs): Promise<void> => {
    /*const { event, threds } = args;
    const delayMillis = (Events.getContent(event)?.values as SystemEventValues)?.delay;
    return threds.shutdown(delayMillis);*/
  };

  private operations: StringMap<(args: AdminServiceArgs) => Promise<EventValues['values']>> = {
    //[systemEventTypes.operations.expireReaction]: this.expireReaction,
    //[systemEventTypes.operations.transitionThred]: this.transitionThred,
    [systemEventTypes.operations.getThreds]: this.getThreds,
    [systemEventTypes.operations.terminateThred]: this.terminateThred,
    //[systemEventTypes.operations.resetPattern]: this.resetPattern,
    //[systemEventTypes.operations.terminateAllThreds]: this.terminateAllThreds,
    //[systemEventTypes.operations.shutdown]: this.shutdown,
  };
}
