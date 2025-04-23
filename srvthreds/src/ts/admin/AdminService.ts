import {
  Event,
  eventTypes,
  Events,
  StringMap,
  systemEventTypes,
  SystemEventInputValues,
  errorKeys,
  errorCodes,
  EventValues,
  TerminateThreadArgs,
  SystemEventThredInputValues,
  GetThredsArgs,
  TransitionThredArgs,
  TerminateAllThredsArgs,
  ShutdownArgs,
  ReloadPatternArgs,
} from '../thredlib/index.js';
import { EventThrowable } from '../thredlib/core/Errors.js';
import { Thred } from '../engine/Thred.js';
import { Threds } from '../engine/Threds.js';
import { Transition } from '../engine/Transition.js';
import { PersistenceManager } from '../engine/persistence/PersistenceManager.js';
import { PubSubFactory } from '../pubsub/PubSubFactory.js';
import { Topics } from '../pubsub/Topics.js';

/***
 *       _       _           _           ___                      _   _
 *      /_\   __| |_ __ ___ (_)_ __     /___\_ __   ___ _ __ __ _| |_(_) ___  _ __  ___
 *     //_\\ / _` | '_ ` _ \| | '_ \   //  // '_ \ / _ \ '__/ _` | __| |/ _ \| '_ \/ __|
 *    /  _  \ (_| | | | | | | | | | | / \_//| |_) |  __/ | | (_| | |_| | (_) | | | \__ \
 *    \_/ \_/\__,_|_| |_| |_|_|_| |_| \___/ | .__/ \___|_|  \__,_|\__|_|\___/|_| |_|___/
 *                                          |_|
 */

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
  static isAdminEvent(event: Event): boolean {
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

  /***
   *     _____ _                  _     ___            _             _
   *    /__   \ |__  _ __ ___  __| |   / __\___  _ __ | |_ _ __ ___ | |
   *      / /\/ '_ \| '__/ _ \/ _` |  / /  / _ \| '_ \| __| '__/ _ \| |
   *     / /  | | | | | |  __/ (_| | / /__| (_) | | | | |_| | | (_) | |
   *     \/   |_| |_|_|  \___|\__,_| \____/\___/|_| |_|\__|_|  \___/|_|
   *
   */

  /*
        Move the thred to the given state
    */
  transitionThred = async (args: AdminServiceArgs): Promise<EventValues['values']> => {
    const {
      event,
      args: { thredId, op, transition },
    } = this.getThredArgs<TransitionThredArgs>(args);
    await this.threds.thredsStore.withThredStore(thredId, async (thredStore) => {
      if (!thredStore) {
        throw EventThrowable.get(
          `Thred ${thredId} does not, or no longer exists`,
          errorCodes[errorKeys.THRED_DOES_NOT_EXIST].code,
        );
      }
      await Thred.transition(thredStore, this.threds, new Transition(transition));
    });
    return { status: systemEventTypes.successfulStatus, op, thredId };
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
      if (!thredStore) {
        throw EventThrowable.get(
          `Thred ${thredId} does not, or no longer exists`,
          errorCodes[errorKeys.THRED_DOES_NOT_EXIST].code,
        );
      }
      thredStore.finish();
    });
    return { status: systemEventTypes.successfulStatus, op, thredId };
  };

  /***
   *     __               ___            _             _
   *    / _\_   _ ___    / __\___  _ __ | |_ _ __ ___ | |
   *    \ \| | | / __|  / /  / _ \| '_ \| __| '__/ _ \| |
   *    _\ \ |_| \__ \ / /__| (_) | | | | |_| | | (_) | |
   *    \__/\__, |___/ \____/\___/|_| |_|\__|_|  \___/|_|
   *        |___/
   */

  /*
    Get all current threds or a specific set of threds
  */
  getThreds = async (args: AdminServiceArgs): Promise<EventValues['values']> => {
    const {
      event,
      args: { op, thredIds, status, completedMatcher },
    } = this.getArgs<GetThredsArgs>(args);
    // status defaults to active
    let threds: any[] = [];
    if (status !== 'completed') {
      const thredStores = await (thredIds?.length
        ? this.threds.thredsStore.getThredStores(thredIds!)
        : this.threds.thredsStore.getAllThredStores());
      threds = thredStores.map((thredStore) => thredStore.toJSON());
    }
    if (status === 'completed' || status === 'all') {
      const thredRecords = await PersistenceManager.get().getThreds(completedMatcher || {});
      if (thredRecords?.length) {
        threds.push(...thredRecords.map((thredRecord) => thredRecord.thred));
      }
    }

    return {
      status: systemEventTypes.successfulStatus,
      op,
      threds,
    };
  };

  reloadPattern = async (args: AdminServiceArgs): Promise<EventValues['values']> => {
    const {
      event,
      args: { op, patternId },
    } = this.getArgs<ReloadPatternArgs>(args);
    if (!patternId) {
      throw EventThrowable.get(
        `No patternId supplied for reloadPattern operation on System`,
        errorCodes[errorKeys.MISSING_ARGUMENT_ERROR].code,
      );
    }
    const patternModel = await PersistenceManager.get().getActivePattern(patternId);
    if (!patternModel) {
      throw EventThrowable.get(
        `Pattern ${patternId} not found or NOT ACTIVE for reloadPattern operation on System`,
        errorCodes[errorKeys.OBJECT_NOT_FOUND].code,
      );
    }

    await this.threds.thredsStore.patternsStore.storePatternModel(patternModel);
    await PubSubFactory.getPubSub().publish(Topics.PatternChanged, { id: patternId });
    return { status: systemEventTypes.successfulStatus, op, patternId };
  };

  terminateAllThreds = async (args: AdminServiceArgs): Promise<EventValues['values']> => {
    const {
      event,
      args: { op },
    } = this.getArgs<TerminateAllThredsArgs>(args);
    await this.threds.thredsStore.terminateAllThreds();
    return { status: systemEventTypes.successfulStatus, op };
  };

  shutdown = async (args: AdminServiceArgs): Promise<EventValues['values']> => {
    const {
      event,
      args: { op, delay },
    } = this.getArgs<ShutdownArgs>(args);
    await this.threds.shutdown(delay);
    return { status: systemEventTypes.successfulStatus, op };
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

  private operations: StringMap<(args: AdminServiceArgs) => Promise<EventValues['values']>> = {
    [systemEventTypes.operations.transitionThred]: this.transitionThred,
    [systemEventTypes.operations.getThreds]: this.getThreds,
    [systemEventTypes.operations.terminateThred]: this.terminateThred,
    [systemEventTypes.operations.reloadPattern]: this.reloadPattern,
    [systemEventTypes.operations.terminateAllThreds]: this.terminateAllThreds,
    [systemEventTypes.operations.shutdown]: this.shutdown,
  };
}
