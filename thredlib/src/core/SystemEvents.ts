import { systemEventTypes, eventTypes, ThredId } from './types.js';
import { TransitionModel } from '../model/TransitionModel.js';
import { PatternModel } from '../model/PatternModel.js';
import { Event, EventTaskParams } from './Event.js';
import { EventBuilder } from './EventBuilder.js';
import { Operations } from '../task/Operations.js';
import { Types } from '../persistence/types.js';
import { Thred } from './Thred.js';
import { EventRecord } from '../persistence/EventRecord.js';
/***
 *     __           _                     __                 _      _____                   _   
 *    / _\_   _ ___| |_ ___ _ __ ___     /__\_   _____ _ __ | |_    \_   \_ __  _ __  _   _| |_ 
 *    \ \| | | / __| __/ _ \ '_ ` _ \   /_\ \ \ / / _ \ '_ \| __|    / /\/ '_ \| '_ \| | | | __|
 *    _\ \ |_| \__ \ ||  __/ | | | | | //__  \ V /  __/ | | | |_  /\/ /_ | | | | |_) | |_| | |_ 
 *    \__/\__, |___/\__\___|_| |_| |_| \__/   \_/ \___|_| |_|\__| \____/ |_| |_| .__/ \__,_|\__|
 *        |___/                                                                |_|              
 */
export interface SystemEventInputValues {
  readonly op: string;
}
export interface SystemEventThredInputValues extends SystemEventInputValues {
  readonly thredId: string;
}

export interface GetThredsArgs extends SystemEventInputValues {
  readonly thredIds?: string[] | undefined;
  // defaults to active
  readonly status?: 'active' | 'terminated' | 'all';
  readonly terminatedMatcher?: EventTaskParams['matcher'];
}

export interface WatchThredsArgs extends SystemEventInputValues {
  directive?: 'start' | 'stop' | 'renew';
}

export interface ReloadPatternArgs extends SystemEventInputValues {
  readonly patternId: string;
}

export interface TerminateAllThredsArgs extends SystemEventInputValues {}

export interface ShutdownArgs extends SystemEventInputValues {
  readonly delay: number;
}

export interface TransitionThredArgs extends SystemEventThredInputValues {
  readonly transition: TransitionModel;
}

export interface ExpireReactionArgs extends SystemEventThredInputValues {
  readonly reactionName: string;
}

export interface TerminateThreadArgs extends SystemEventThredInputValues {}

export interface GetEventsArgs extends SystemEventThredInputValues {}


/***
 *                            __           _                     __                 _      _____                   _   
 *     /\ /\  ___  ___ _ __  / _\_   _ ___| |_ ___ _ __ ___     /__\_   _____ _ __ | |_    \_   \_ __  _ __  _   _| |_ 
 *    / / \ \/ __|/ _ \ '__| \ \| | | / __| __/ _ \ '_ ` _ \   /_\ \ \ / / _ \ '_ \| __|    / /\/ '_ \| '_ \| | | | __|
 *    \ \_/ /\__ \  __/ |    _\ \ |_| \__ \ ||  __/ | | | | | //__  \ V /  __/ | | | |_  /\/ /_ | | | | |_) | |_| | |_ 
 *     \___/ |___/\___|_|    \__/\__, |___/\__\___|_| |_| |_| \__/   \_/ \___|_| |_|\__| \____/ |_| |_| .__/ \__,_|\__|
 *                               |___/                                                                |_|              
 */

export interface GetUserThredsArgs extends SystemEventInputValues {
  readonly thredIds?: string[] | undefined;
  // defaults to active
  readonly status?: 'active' | 'terminated' | 'all';
  readonly terminatedMatcher?: EventTaskParams['matcher'];
}

export interface GetUserEventsArgs extends SystemEventThredInputValues {}


/***
 *     __           _                     __                 _       __      _                      _____                       
 *    / _\_   _ ___| |_ ___ _ __ ___     /__\_   _____ _ __ | |_    /__\ ___| |_ _   _ _ __ _ __   /__   \_   _ _ __   ___  ___ 
 *    \ \| | | / __| __/ _ \ '_ ` _ \   /_\ \ \ / / _ \ '_ \| __|  / \/// _ \ __| | | | '__| '_ \    / /\/ | | | '_ \ / _ \/ __|
 *    _\ \ |_| \__ \ ||  __/ | | | | | //__  \ V /  __/ | | | |_  / _  \  __/ |_| |_| | |  | | | |  / /  | |_| | |_) |  __/\__ \
 *    \__/\__, |___/\__\___|_| |_| |_| \__/   \_/ \___|_| |_|\__| \/ \_/\___|\__|\__,_|_|  |_| |_|  \/    \__, | .__/ \___||___/
 *        |___/                                                                                           |___/|_|              
 */
export interface SystemResult {
  op: string;
  status: string;
}

/***
 *                            __           _                     __                 _       __      _                      _____                       
 *     /\ /\  ___  ___ _ __  / _\_   _ ___| |_ ___ _ __ ___     /__\_   _____ _ __ | |_    /__\ ___| |_ _   _ _ __ _ __   /__   \_   _ _ __   ___  ___ 
 *    / / \ \/ __|/ _ \ '__| \ \| | | / __| __/ _ \ '_ ` _ \   /_\ \ \ / / _ \ '_ \| __|  / \/// _ \ __| | | | '__| '_ \    / /\/ | | | '_ \ / _ \/ __|
 *    \ \_/ /\__ \  __/ |    _\ \ |_| \__ \ ||  __/ | | | | | //__  \ V /  __/ | | | |_  / _  \  __/ |_| |_| | |  | | | |  / /  | |_| | |_) |  __/\__ \
 *     \___/ |___/\___|_|    \__/\__, |___/\__\___|_| |_| |_| \__/   \_/ \___|_| |_|\__| \/ \_/\___|\__|\__,_|_|  |_| |_|  \/    \__, | .__/ \___||___/
 *                               |___/                                                                                           |___/|_|              
 */

export interface GetUserThredsResult extends SystemResult {
  results: Array<{
    thred: Thred;
    lastEvent: EventRecord | null;
  }>;
}

export interface GetUserEventsResult extends SystemResult {
  op: string;
  status: string;
  events: EventRecord[] | null;
}

export class SystemEvents {
  /***
   *       _       _           _         _____ _                  _     ___            _             _
   *      /_\   __| |_ __ ___ (_)_ __   /__   \ |__  _ __ ___  __| |   / __\___  _ __ | |_ _ __ ___ | |
   *     //_\\ / _` | '_ ` _ \| | '_ \    / /\/ '_ \| '__/ _ \/ _` |  / /  / _ \| '_ \| __| '__/ _ \| |
   *    /  _  \ (_| | | | | | | | | | |  / /  | | | | | |  __/ (_| | / /__| (_) | | | | |_| | | (_) | |
   *    \_/ \_/\__,_|_| |_| |_|_|_| |_|  \/   |_| |_|_|  \___|\__,_| \____/\___/|_| |_|\__|_|  \___/|_|
   *
   */

  // request to explicitly transition a thred to a new state
  static getTransitionThredEvent(thredId: string, transition: TransitionModel, source: Event['source']) {
    const values: TransitionThredArgs = { op: systemEventTypes.operations.transitionThred, thredId, transition };
    return EventBuilder.create({
      type: eventTypes.control.sysControl.type,
      thredId: ThredId.SYSTEM,
      source,
    })
      .mergeValues(values)
      .mergeData({ title: 'Run Transition Thred' })
      .build();
  }

  // request to terminate a thred
  static getTerminateThredEvent(thredId: string, source: Event['source']) {
    const values: TerminateThreadArgs = { op: systemEventTypes.operations.terminateThred, thredId };
    return EventBuilder.create({
      type: eventTypes.control.sysControl.type,
      thredId: ThredId.SYSTEM,
      source,
    })
      .mergeValues(values)
      .mergeData({ title: 'Run Terminate Thred' })
      .build();
  }

  /***
   *       _       _           _         __               ___            _             _
   *      /_\   __| |_ __ ___ (_)_ __   / _\_   _ ___    / __\___  _ __ | |_ _ __ ___ | |
   *     //_\\ / _` | '_ ` _ \| | '_ \  \ \| | | / __|  / /  / _ \| '_ \| __| '__/ _ \| |
   *    /  _  \ (_| | | | | | | | | | | _\ \ |_| \__ \ / /__| (_) | | | | |_| | | (_) | |
   *    \_/ \_/\__,_|_| |_| |_|_|_| |_| \__/\__, |___/ \____/\___/|_| |_|\__|_|  \___/|_|
   *                                        |___/
   */

  static getGetThredsEvent(
    source: Event['source'],
    status?: GetThredsArgs['status'],
    terminatedMatcher?: EventTaskParams['matcher'],
  ) {
    const values: GetThredsArgs = { op: systemEventTypes.operations.getThreds, status, terminatedMatcher };
    return EventBuilder.create({
      type: eventTypes.control.sysControl.type,
      thredId: ThredId.SYSTEM,
      source,
    })
      .mergeValues(values)
      .mergeData({ title: 'Run Get Threds' })
      .build();
  }

  static getWatchThredsEvent(source: Event['source'], directive?: WatchThredsArgs['directive']) {
    const values: WatchThredsArgs = { op: systemEventTypes.operations.watchThreds, directive };
    return EventBuilder.create({
      type: eventTypes.control.sysControl.type,
      thredId: ThredId.SYSTEM,
      source,
    })
      .mergeValues(values)
      .mergeData({ title: 'Run Watch Threds' })
      .build();
  }

  static getReloadPatternEvent(patternId: string, source: Event['source']) {
    const values: ReloadPatternArgs = { op: systemEventTypes.operations.reloadPattern, patternId };
    return EventBuilder.create({
      type: eventTypes.control.sysControl.type,
      thredId: ThredId.SYSTEM,
      source,
    })
      .mergeValues(values)
      .mergeData({ title: 'Run Reload Pattern' })
      .build();
  }

  // request to shutdown
  static getShutdownEvent(delay: number, source: Event['source']) {
    const values: ShutdownArgs = { op: systemEventTypes.operations.shutdown, delay };
    return EventBuilder.create({
      type: eventTypes.control.sysControl.type,
      thredId: ThredId.SYSTEM,
      source,
    })
      .mergeValues(values)
      .mergeData({ title: 'Run Shutdown' })
      .build();
  }

  // request to terminate all threds
  static getTerminateAllThredsEvent(source: Event['source']) {
    const values: TerminateAllThredsArgs = { op: systemEventTypes.operations.terminateAllThreds };
    return EventBuilder.create({
      type: eventTypes.control.sysControl.type,
      thredId: ThredId.SYSTEM,
      source,
    })
      .mergeValues(values)
      .mergeData({ title: 'Run Terminate All Threds' })
      .build();
  }

  /***
   *       _       _           _            ___      _            ___
   *      /_\   __| |_ __ ___ (_)_ __      /   \__ _| |_ __ _    /___\_ __  ___
   *     //_\\ / _` | '_ ` _ \| | '_ \    / /\ / _` | __/ _` |  //  // '_ \/ __|
   *    /  _  \ (_| | | | | | | | | | |  / /_// (_| | || (_| | / \_//| |_) \__ \
   *    \_/ \_/\__,_|_| |_| |_|_|_| |_| /___,' \__,_|\__\__,_| \___/ | .__/|___/
   *                                                                 |_|
   */
  static getSavePatternEvent(pattern: PatternModel, source: Event['source']) {
    return EventBuilder.create({
      type: eventTypes.control.dataControl.type,
      thredId: ThredId.SYSTEM,
      source,
    })
      .mergeTasks({ name: 'storePattern', op: Operations.PUT_OP, params: { type: Types.PatternModel, values: pattern } })
      .mergeData({ title: `Store Pattern ${pattern.name}` })
      .build();
  }

  static getFindPatternEvent(patternId: string, source: Event['source']) {
    return EventBuilder.create({
      type: eventTypes.control.dataControl.type,
      thredId: ThredId.SYSTEM,
      source,
    })
      .mergeTasks({
        name: 'findPattern',
        op: Operations.GET_ONE_OP,
        params: { type: Types.PatternModel, matcher: { id: patternId } },
      })
      .mergeData({ title: 'Find Pattern' })
      .build();
  }

  static getFindAllPatternsEvent(source: Event['source']) {
    return EventBuilder.create({
      type: eventTypes.control.dataControl.type,
      thredId: ThredId.SYSTEM,
      source,
    })
      .mergeTasks({ name: 'findAllPatterns', op: Operations.GET_OP, params: { type: Types.PatternModel } })
      .mergeData({ title: 'Find All Patterns' })
      .build();
  }

  static getFindPatternsEvent(matcher: EventTaskParams['matcher'], source: Event['source']) {
    return EventBuilder.create({
      type: eventTypes.control.dataControl.type,
      thredId: ThredId.SYSTEM,
      source,
    })
      .mergeTasks({ name: 'findPatterns', op: Operations.GET_OP, params: { type: Types.PatternModel, matcher } })
      .mergeData({ title: 'Find Patterns' })
      .build();
  }

  static getUpdatePatternEvent(patternId: string, source: Event['source'], updateValues: EventTaskParams['values']) {
    return EventBuilder.create({
      type: eventTypes.control.dataControl.type,
      thredId: ThredId.SYSTEM,
      source,
    })
      .mergeTasks({
        name: 'updatePattern',
        op: Operations.UPDATE_OP,
        params: {
          type: Types.PatternModel,
          matcher: { id: patternId },
          values: updateValues,
        },
      })
      .mergeData({ title: 'Update Pattern' })
      .build();
  }

  static getDeletePatternEvent(patternId: string, source: Event['source']) {
    return EventBuilder.create({
      type: eventTypes.control.dataControl.type,
      thredId: ThredId.SYSTEM,
      source,
    })
      .mergeTasks([
        { name: 'deletePattern', op: Operations.DELETE_OP, params: { type: Types.PatternModel, matcher: { id: patternId } } },
      ])
      .mergeData({ title: 'Delete Pattern' })
      .build();
  }

  static getEventsForThredEvent(thredId: string, source: Event['source']) {
    return EventBuilder.create({
      type: eventTypes.control.dataControl.type,
      thredId: ThredId.SYSTEM,
      source,
    })
      .mergeTasks({
        name: 'findEvents',
        op: Operations.GET_OP,
        params: { type: Types.EventRecord, matcher: { thredId }, collector: { sort: [{ field: 'timestamp' }] } },
      })
      .mergeData({ title: 'Find Events' })
      .build();
  }

  static getFindEventsEvent(matcher: EventTaskParams['matcher'], source: Event['source']) {
    return EventBuilder.create({
      type: eventTypes.control.dataControl.type,
      thredId: ThredId.SYSTEM,
      source,
    })
      .mergeTasks({ name: 'findEvents', op: Operations.GET_OP, params: { type: Types.EventRecord, matcher } })
      .mergeData({ title: 'Find Events' })
      .build();
  }

  static getThredLogForThredEvent(thredId: string, source: Event['source']) {
    return EventBuilder.create({
      type: eventTypes.control.dataControl.type,
      thredId: ThredId.SYSTEM,
      source,
    })
      .mergeTasks({
        name: 'getThredLog',
        op: Operations.GET_OP,
        params: { type: Types.ThredLogRecord, matcher: { thredId }, collector: { sort: [{ field: 'timestamp' }] } },
      })
      .mergeData({ title: 'Get ThredLog' })
      .build();
  }

  /***
   *                              ___            _             _     ___
   *     /\ /\  ___  ___ _ __    / __\___  _ __ | |_ _ __ ___ | |   /___\_ __  ___
   *    / / \ \/ __|/ _ \ '__|  / /  / _ \| '_ \| __| '__/ _ \| |  //  // '_ \/ __|
   *    \ \_/ /\__ \  __/ |    / /__| (_) | | | | |_| | | (_) | | / \_//| |_) \__ \
   *     \___/ |___/\___|_|    \____/\___/|_| |_|\__|_|  \___/|_| \___/ | .__/|___/
   *                                                                    |_|
   */
  static getGetUserThredsEvent(
    source: Event['source'],
    status?: GetUserThredsArgs['status'],
    terminatedMatcher?: EventTaskParams['matcher'],
  ) {
    const values: GetUserThredsArgs = { op: systemEventTypes.operations.user.getThreds, status, terminatedMatcher };
    return EventBuilder.create({
      type: eventTypes.control.userControl.type,
      thredId: ThredId.SYSTEM,
      source,
    })
      .mergeValues(values)
      .mergeData({ title: 'Run Get User Threds' })
      .build();
  }

  // yes, this is ridiculous, but it actually means what it says
  static getGetUserEventsEvent(thredId: string, source: Event['source']) {
    const values: GetUserEventsArgs = { op: systemEventTypes.operations.user.getEvents, thredId };
    return EventBuilder.create({
      type: eventTypes.control.userControl.type,
      thredId: ThredId.SYSTEM,
      source,
    })
      .mergeValues(values)
      .mergeData({ title: 'Run Get User Events' })
      .build();
  }
}
