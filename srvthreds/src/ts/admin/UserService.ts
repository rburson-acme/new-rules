import { ParticipantsStore } from '../engine/store/ParticipantsStore.js';
import { Threds } from '../engine/Threds.js';
import { SystemController } from '../persistence/controllers/SystemController.js';
import { UserController } from '../persistence/controllers/UserController.js';
import { EventThrowable } from '../thredlib/core/Errors.js';
import {
  errorCodes,
  errorKeys,
  Event,
  Events,
  eventTypes,
  EventValues,
  GetEventsArgs,
  GetThredsArgs,
  StringMap,
  SystemEventInputValues,
  systemEventTypes,
} from '../thredlib/index.js';
import { User } from '../thredlib/persistence/User.js';
import { SystemService, SystemServiceArgs } from './SystemService.js';

/***
 *                              ___                      _   _
 *     /\ /\  ___  ___ _ __    /___\_ __   ___ _ __ __ _| |_(_) ___  _ __  ___
 *    / / \ \/ __|/ _ \ '__|  //  // '_ \ / _ \ '__/ _` | __| |/ _ \| '_ \/ __|
 *    \ \_/ /\__ \  __/ |    / \_//| |_) |  __/ | | (_| | |_| | (_) | | | \__ \
 *     \___/ |___/\___|_|    \___/ | .__/ \___|_|  \__,_|\__|_|\___/|_| |_|___/
 *                                 |_|
 */
export class UserService {
  constructor(private threds: Threds) {}

  //@TODO authenticate sender source (up channel) so this is secure
  static isUserControlEvent(event: Event): boolean {
    return event.type === eventTypes.control.userControl.type;
  }

  async handleSystemEvent(args: SystemServiceArgs): Promise<EventValues['values']> {
    return SystemService.handleSystemEvent(args, this.operations);
  }

  /*
    Get threds associated with a given participant 
  */
  getThreds = async (args: SystemServiceArgs): Promise<EventValues['values']> => {
    const {
      event,
      args: { op, thredIds, status, terminatedMatcher = {} },
    } = SystemService.getArgs<GetThredsArgs>(args);
    const participantId = event.source.id;
    let threds: any[] = [];
    // status defaults to active
    if (status !== 'terminated') {
      const thredStores = await this.threds.thredsStore.getThredsForParticipant(participantId, thredIds);
      threds = thredStores.map((thredStore) => thredStore.toJSON());
    }
    if (status === 'terminated' || status === 'all') {
      // get participant's terminated threds
      const user = await UserController.get().getUserArchivedThredIds(participantId);
      if (user?.threds?.archived?.length) {
        const thredRecords = await SystemController.get().getThreds({
          ...terminatedMatcher,
          ...{ id: { $in: user.threds.archived } },
        });
        if (thredRecords?.length) {
          threds.push(...thredRecords.map((thredRecord) => thredRecord.thred));
        }
      }
    }

    return {
      status: systemEventTypes.successfulStatus,
      op,
      threds,
    };
  };

  getEvents = async (args: SystemServiceArgs): Promise<EventValues['values']> => {
    const {
      event,
      args: { op, thredId },
    } = SystemService.getArgs<GetEventsArgs>(args);
    if (!thredId) {
      throw EventThrowable.get({
        message: `No thredId supplied for getEvents operation`,
        code: errorCodes[errorKeys.MISSING_ARGUMENT_ERROR].code,
      });
    }
    const events = SystemController.get().getEventsForParticipant(thredId, event.source.id);
    return {
      status: systemEventTypes.successfulStatus,
      op,
      events,
    };
  };

  private operations: StringMap<(args: SystemServiceArgs) => Promise<EventValues['values']>> = {
    [systemEventTypes.operations.user.getThreds]: this.getThreds,
  };
}
