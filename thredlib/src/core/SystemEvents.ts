import { Events } from './Events.js';
import { systemEventTypes, eventTypes, ThredId } from './types.js';
import { TransitionModel } from '../model/TransitionModel.js';
import { PatternModel } from '../model/PatternModel.js';
import { Event } from './Event.js';
import { S } from 'vitest/dist/chunks/config.CHuotKvS.js';
import { EventBuilder } from './EventBuilder.js';

export interface SystemEventInputValues {
  readonly op: string;
  /*readonly thredId?: string;
  readonly reactionName?: string;
  readonly patternId?: string;
  readonly scope?: string;
  readonly delay?: number;*/
}
export interface SystemEventThredInputValues extends SystemEventInputValues {
  thredId: string;
}

export interface GetThredsArgs extends SystemEventInputValues {
  thredIds: string[] | undefined;
}

export interface TransitionThredArgs extends SystemEventThredInputValues {
  readonly transition: TransitionModel;
}

export interface TerminateThreadArgs extends SystemEventThredInputValues {}

export class SystemEvents {
  /***
   *     _____ _                  _     ___            _             _
   *    /__   \ |__  _ __ ___  __| |   / __\___  _ __ | |_ _ __ ___ | |
   *      / /\/ '_ \| '__/ _ \/ _` |  / /  / _ \| '_ \| __| '__/ _ \| |
   *     / /  | | | | | |  __/ (_| | / /__| (_) | | | | |_| | | (_) | |
   *     \/   |_| |_|_|  \___|\__,_| \____/\___/|_| |_|\__|_|  \___/|_|
   *
   */

  // request to expire current thred reaction
  static getSystemExpireThredEvent(id: string, thredId: string, reactionName: string, source: Event['source']) {
    return Events.newEvent({
      id,
      type: eventTypes.control.thredControl.type,
      source,
      data: {
        content: {
          values: {
            op: systemEventTypes.operations.expireReaction,
            reactionName,
            thredId,
          },
        },
      },
    });
  }

  // request to explicitly transition a thred to a new state
  static getSystemTransitionThredEvent(
    id: string,
    thredId: string,
    transition: TransitionModel,
    source: Event['source'],
  ) {
    return Events.newEvent({
      id,
      type: eventTypes.control.thredControl.type,
      source,
      data: {
        content: {
          values: {
            op: systemEventTypes.operations.transitionThred,
            transition,
            thredId,
          },
        },
      },
    });
  }

  // request to terminate a thred
  static getSystemTerminateThredEvent(thredId: string, source: Event['source']) {
    return EventBuilder.create({
      type: eventTypes.control.sysControl.type,
      source,
    })
      .mergeValues({ op: systemEventTypes.operations.terminateThred, thredId })
      .mergeData({ title: 'Run Terminate Thred' })
      .build();
  }

  /***
   *     __               ___            _             _
   *    / _\_   _ ___    / __\___  _ __ | |_ _ __ ___ | |
   *    \ \| | | / __|  / /  / _ \| '_ \| __| '__/ _ \| |
   *    _\ \ |_| \__ \ / /__| (_) | | | | |_| | | (_) | |
   *    \__/\__, |___/ \____/\___/|_| |_|\__|_|  \___/|_|
   *        |___/
   */

  // request to reset the number of pattern instances to 0 for a particular pattern
  static getResetPatternEvent(id: string, patternId: string, source: Event['source']) {
    return Events.newEvent({
      id,
      type: eventTypes.control.sysControl.type,
      source,
      data: {
        content: {
          values: {
            op: systemEventTypes.operations.resetPattern,
            patternId,
          },
        },
      },
    });
  }

  // request to shutdown
  static getShutdownEvent(id: string, delay: number, source: Event['source']) {
    return Events.newEvent({
      id,
      type: eventTypes.control.sysControl.type,
      source,
      data: {
        content: {
          values: {
            op: systemEventTypes.operations.shutdown,
            delay,
          },
        },
      },
    });
  }

  // request to terminate all threds
  static getTerminateAllThredsEvent(id: string, source: Event['source']) {
    return Events.newEvent({
      id,
      type: eventTypes.control.sysControl.type,
      source,
      data: {
        content: {
          values: {
            op: systemEventTypes.operations.terminateAllThreds,
          },
        },
      },
    });
  }

  /***
   *        ___      _            ___
   *       /   \__ _| |_ __ _    /___\_ __  ___
   *      / /\ / _` | __/ _` |  //  // '_ \/ __|
   *     / /_// (_| | || (_| | / \_//| |_) \__ \
   *    /___,' \__,_|\__\__,_| \___/ | .__/|___/
   *                                 |_|
   */

  getStoreObjectEvent(id: string, source: Event['source'], objectType: string, obj: {}) {
    return Events.newEvent({
      id,
      type: eventTypes.control.dataControl.type,
      source,
      data: {
        content: {
          values: {
            objectType,
            obj,
          },
        },
      },
    });
  }
}
