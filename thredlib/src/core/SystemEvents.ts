import { Events } from './Events.js';
import { systemEventTypes, eventTypes, ThredId } from './types.js';
import { TransitionModel } from '../model/TransitionModel.js';
import { PatternModel } from '../model/PatternModel.js';
import { Event } from './Event.js';

export interface SystemEventValues {
  readonly op?: string;
  reactionName?: string;
  transition?: TransitionModel;
  patternId?: string;
  scope?: string;
  delay?: number;
  patternModel?: PatternModel;
}

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
      thredId,
      data: {
        content: {
          values: {
            op: systemEventTypes.operations.expireReaction,
            reactionName,
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
      thredId,
      data: {
        content: {
          values: {
            op: systemEventTypes.operations.transitionThred,
            transition,
          },
        },
      },
    });
  }

  // request to terminate a thred
  static getSystemTerminateThredEvent(id: string, thredId: string, source: Event['source']) {
    return Events.newEvent({
      id,
      type: eventTypes.control.thredControl.type,
      source,
      thredId,
      data: {
        content: {
          values: {
            op: systemEventTypes.operations.terminateThred,
          },
        },
      },
    });
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

  // save a PatternModel to persistent storage
  static getSavePatternEvent(id: string, patternModel: PatternModel, source: Event['source']) {
    return Events.newEvent({
      id,
      type: eventTypes.control.sysControl.type,
      source,
      data: {
        content: {
          values: {
            op: systemEventTypes.operations.savePattern,
            patternModel,
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
