import { ConfigLoader } from '../config/ConfigLoader.js';
import { ConfigManager } from '../config/ConfigManager.js';
import { ResolverConfig } from '../config/ResolverConfig.js';
import { SessionsConfig } from '../config/SessionsConfig.js';
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
  GetUserEventsArgs,
  GetUserThredsArgs,
  Series,
  StringMap,
  systemEventTypes,
  GetUserThredsResult,
  GetUserEventsResult,
  GetSystemSpecResult,
  GetSystemSpecArgs,
  ServiceSpec,
  Parallel,
  ParticipantSpec,
  GroupSpec,
  SystemSpec,
} from '../thredlib/index.js';
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
    // delegate to SystemService op mapping
    return SystemService.handleSystemEvent(args, this.operations);
  }

  /*
    Get threds associated with a given participant 
  */
  //@TODO this should be done with join/aggregation support once it's added to the persistence layer
  getThreds = async (args: SystemServiceArgs): Promise<GetUserThredsResult> => {
    const {
      event,
      args: { op, thredIds, status, terminatedMatcher = {} },
    } = SystemService.getArgs<GetUserThredsArgs>(args);
    const participantId = event.source.id;
    let results: any[] = [];
    // status defaults to active
    if (status !== 'terminated') {
      const thredStores = await this.threds.thredsStore.getThredsForParticipant(participantId, thredIds);
      results = await Series.map(thredStores, async (thredStore) => {
        const lastEvent = await SystemController.get().getLastEventForParticipant(participantId, thredStore.id);
        return { thred: thredStore.toJSON(), lastEvent };
      });
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
          results.push(
            ...(await Series.map(thredRecords, async (thredRecord) => {
              const lastEvent = await SystemController.get().getLastEventForParticipant(participantId, thredRecord.id);
              return { thred: thredRecord.thred, lastEvent };
            })),
          );
        }
      }
    }
    // sort by last event timestamp
    results.sort((a, b) => (b.lastEvent?.timestamp ?? 0) - (a.lastEvent?.timestamp ?? 0));

    return {
      status: systemEventTypes.successfulStatus,
      op,
      results,
    };
  };

  getEvents = async (args: SystemServiceArgs): Promise<GetUserEventsResult> => {
    const {
      event,
      args: { op, thredId },
    } = SystemService.getArgs<GetUserEventsArgs>(args);
    if (!thredId) {
      throw EventThrowable.get({
        message: `No thredId supplied for getEvents operation`,
        code: errorCodes[errorKeys.MISSING_ARGUMENT_ERROR].code,
      });
    }
    const events = await SystemController.get().getEventsForParticipant(event.source.id, thredId);
    return {
      status: systemEventTypes.successfulStatus,
      op,
      events,
    };
  };

  getSystemSpec = async (args: SystemServiceArgs): Promise<GetSystemSpecResult> => {
    const {
      event,
      args: { op },
    } = SystemService.getArgs<GetSystemSpecArgs>(args);
    const resolverConfig = ConfigManager.get().getConfig<ResolverConfig>('resolver-config');
    const sessionModel = ConfigManager.get().getConfig<SessionsConfig>('sessions-model');
    if (!resolverConfig || !sessionModel) {
      throw EventThrowable.get({
        message: `Resolver config or session model not loaded for getSystemSpec()`,
        code: errorCodes[errorKeys.SERVER_ERROR].code,
      });
    }
    const serviceSpecs: ServiceSpec[] = [];
    await Parallel.forEach(resolverConfig.configNames, async (configName) => {
      // use to build service specs
      const serviceConfig = resolverConfig.getServiceConfigDefForName(configName);
      if (!serviceConfig?.hidden) {
        const serviceSpec: ServiceSpec = await ConfigLoader.loadFromNameOrPath(`${configName}_meta`);
        // servicespec can override nodeType and address but they default to the resolver config nodeType
        serviceSpecs.push({
          ...{ nodeType: serviceConfig!.nodeType, address: serviceConfig!.nodeType },
          ...serviceSpec,
        });
      }
    });

    const users = await UserController.get().getUsers();
    const participants: ParticipantSpec[] = users?.map((user) => ({ id: user.id })) || [];

    const groups: GroupSpec[] = Object.values(sessionModel.groups).map((group) => ({
      name: group.name,
      // select the items we want to expose for participant
      participants: group.participants.map((participant) => ({ participantId: participant.participantId })),
    }));

    const systemSpec: SystemSpec = {
      serviceSpecs,
      addressSpec: {
        participants,
        groups,
      },
    };

    return {
      status: systemEventTypes.successfulStatus,
      op,
      systemSpec,
    };
  };

  private operations: StringMap<(args: SystemServiceArgs) => Promise<EventValues['values']>> = {
    [systemEventTypes.operations.user.getThreds]: this.getThreds,
    [systemEventTypes.operations.user.getEvents]: this.getEvents,
    [systemEventTypes.operations.user.getSystemSpec]: this.getSystemSpec,
  };
}
