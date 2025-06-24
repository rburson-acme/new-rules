import { SubscriberSessionAsPromised } from 'rascal';
import { Thred } from '../engine/Thred.js';
import { Threds } from '../engine/Threds.js';
import { Transition } from '../engine/Transition.js';
import { SystemController } from '../persistence/controllers/SystemController.js';
import { PubSubFactory } from '../pubsub/PubSubFactory.js';
import { Topics } from '../pubsub/Topics.js';
import { EventThrowable } from '../thredlib/core/Errors.js';
import {
  errorCodes,
  errorKeys,
  EventValues,
  GetThredsArgs,
  ReloadPatternArgs,
  ShutdownArgs,
  StringMap,
  systemEventTypes,
  TerminateAllThredsArgs,
  TerminateThreadArgs,
  TransitionThredArgs,
  WatchThredsArgs,
} from '../thredlib/index.js';
import { SystemService, SystemServiceArgs } from './SystemService.js';
import { ParticipantSubscriptions, ParticipantSubscriptionType } from '../sessions/ParticipantSubscriptions.js';
import { NotificationHandler } from './NotificationHandler.js';

/***
 *       _       _           _           ___                      _   _
 *      /_\   __| |_ __ ___ (_)_ __     /___\_ __   ___ _ __ __ _| |_(_) ___  _ __  ___
 *     //_\\ / _` | '_ ` _ \| | '_ \   //  // '_ \ / _ \ '__/ _` | __| |/ _ \| '_ \/ __|
 *    /  _  \ (_| | | | | | | | | | | / \_//| |_) |  __/ | | (_| | |_| | (_) | | | \__ \
 *    \_/ \_/\__,_|_| |_| |_|_|_| |_| \___/ | .__/ \___|_|  \__,_|\__|_|\___/|_| |_|___/
 *                                          |_|
 */

export class AdminService {
  private notificationHandler: NotificationHandler;
  constructor(private threds: Threds) {
    this.notificationHandler = NotificationHandler.getInstance(threds);
  }

  async handleSystemEvent(args: SystemServiceArgs): Promise<EventValues['values']> {
    return SystemService.handleSystemEvent(args, this.operations);
  }

  /***
   *     _____ _                  _     ___            _             _
   *    /__   \ |__  _ __ ___  __| |   / __\___  _ __ | |_ _ __ ___ | |
   *      / /\/ '_ \| '__/ _ \/ _` |  / /  / _ \| '_ \| __| '__/ _ \| |
   *     / /  | | | | | |  __/ (_| | / /__| (_) | | | | |_| | | (_) | |
   *     \/   |_| |_|_|  \___|\__,_| \____/\___/|_| |_|\__|_|  \___/|_|
   *
   */

  /* Thred related operations
    These operations perform thred state changes so are therefore are all synchronous
    */

  /*
        Move the thred to the given state
    */
  transitionThred = async (args: SystemServiceArgs): Promise<EventValues['values']> => {
    const {
      event,
      args: { thredId, op, transition },
    } = SystemService.getThredArgs<TransitionThredArgs>(args);
    await this.threds.thredsStore.withThredStore(thredId, async (thredStore) => {
      if (!thredStore) {
        throw EventThrowable.get({
          message: `Thred ${thredId} does not, or no longer exists`,
          code: errorCodes[errorKeys.THRED_DOES_NOT_EXIST].code,
        });
      }
      await Thred.transition(thredStore, this.threds, new Transition(transition));
    });
    return { status: systemEventTypes.successfulStatus, op, thredId };
  };

  /*
        Terminate the thred
    */
  terminateThred = async (args: SystemServiceArgs): Promise<EventValues['values']> => {
    const {
      event,
      args: { thredId, op },
    } = SystemService.getThredArgs<TerminateThreadArgs>(args);
    await this.threds.thredsStore.withThredStore(thredId, async (thredStore) => {
      if (!thredStore) {
        throw EventThrowable.get({
          message: `Thred ${thredId} does not, or no longer exists`,
          code: errorCodes[errorKeys.THRED_DOES_NOT_EXIST].code,
        });
      }
      thredStore.terminate();
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
  getThreds = async (args: SystemServiceArgs): Promise<EventValues['values']> => {
    const {
      event,
      args: { op, thredIds, status, terminatedMatcher },
    } = SystemService.getArgs<GetThredsArgs>(args);
    // status defaults to active
    let threds: any[] = [];
    if (status !== 'terminated') {
      const thredStores = await (thredIds?.length
        ? this.threds.thredsStore.getThredStoresReadOnly(thredIds!)
        : this.threds.thredsStore.getAllThredStoresReadOnly());
      threds = thredStores.map((thredStore) => thredStore.toJSON());
    }
    if (status === 'terminated' || status === 'all') {
      const thredRecords = await SystemController.get().getThreds(terminatedMatcher || {});
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

  watchRunningThreds = async (args: SystemServiceArgs): Promise<EventValues['values']> => {
    const {
      event,
      args: { op },
    } = SystemService.getArgs<WatchThredsArgs>(args);
    const sourceId = event.source.id;
    this.notificationHandler.registerForNotification(sourceId);
    return { status: systemEventTypes.successfulStatus, op };
  };

  reloadPattern = async (args: SystemServiceArgs): Promise<EventValues['values']> => {
    const {
      event,
      args: { op, patternId },
    } = SystemService.getArgs<ReloadPatternArgs>(args);
    if (!patternId) {
      throw EventThrowable.get({
        message: `No patternId supplied for reloadPattern operation on System`,
        code: errorCodes[errorKeys.MISSING_ARGUMENT_ERROR].code,
      });
    }
    const patternModel = await SystemController.get().getActivePattern(patternId);
    if (!patternModel) {
      throw EventThrowable.get({
        message: `Pattern ${patternId} not found or NOT ACTIVE for reloadPattern operation on System`,
        code: errorCodes[errorKeys.OBJECT_NOT_FOUND].code,
      });
    }

    await this.threds.thredsStore.patternsStore.storePatternModel(patternModel);
    await PubSubFactory.getPub().publish(Topics.PatternChanged, { id: patternId });
    return { status: systemEventTypes.successfulStatus, op, patternId };
  };

  terminateAllThreds = async (args: SystemServiceArgs): Promise<EventValues['values']> => {
    const {
      event,
      args: { op },
    } = SystemService.getArgs<TerminateAllThredsArgs>(args);
    await this.threds.thredsStore.terminateAllThreds();
    return { status: systemEventTypes.successfulStatus, op };
  };

  shutdown = async (args: SystemServiceArgs): Promise<EventValues['values']> => {
    const {
      event,
      args: { op, delay },
    } = SystemService.getArgs<ShutdownArgs>(args);
    await this.threds.shutdown(delay);
    return { status: systemEventTypes.successfulStatus, op };
  };

  private operations: StringMap<(args: SystemServiceArgs) => Promise<EventValues['values']>> = {
    [systemEventTypes.operations.transitionThred]: this.transitionThred,
    [systemEventTypes.operations.getThreds]: this.getThreds,
    [systemEventTypes.operations.terminateThred]: this.terminateThred,
    [systemEventTypes.operations.reloadPattern]: this.reloadPattern,
    [systemEventTypes.operations.terminateAllThreds]: this.terminateAllThreds,
    [systemEventTypes.operations.shutdown]: this.shutdown,
  };
}
