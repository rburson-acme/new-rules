import { systemEventTypes, eventTypes } from './types.js';
import { TransitionModel } from '../model/TransitionModel.js';
import { PatternModel } from '../model/PatternModel.js';
import { Event, EventTaskParams } from './Event.js';
import { EventBuilder } from './EventBuilder.js';

export interface SystemEventInputValues {
  readonly op: string;
}
export interface SystemEventThredInputValues extends SystemEventInputValues {
  readonly thredId: string;
}

export interface GetThredsArgs extends SystemEventInputValues {
  readonly thredIds?: string[] | undefined;
}

export interface ResetPatternArgs extends SystemEventInputValues {
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

export class SystemEvents {
  /***
   *     _____ _                  _     ___            _             _
   *    /__   \ |__  _ __ ___  __| |   / __\___  _ __ | |_ _ __ ___ | |
   *      / /\/ '_ \| '__/ _ \/ _` |  / /  / _ \| '_ \| __| '__/ _ \| |
   *     / /  | | | | | |  __/ (_| | / /__| (_) | | | | |_| | | (_) | |
   *     \/   |_| |_|_|  \___|\__,_| \____/\___/|_| |_|\__|_|  \___/|_|
   *
   */

  // request to explicitly transition a thred to a new state
  static getTransitionThredEvent(thredId: string, transition: TransitionModel, source: Event['source']) {
    const values: TransitionThredArgs = { op: systemEventTypes.operations.transitionThred, thredId, transition };
    return EventBuilder.create({
      type: eventTypes.control.sysControl.type,
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
      source,
    })
      .mergeValues(values)
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
  static getGetThredsEvent(source: Event['source']) {
    const values: GetThredsArgs = { op: systemEventTypes.operations.getThreds };
    return EventBuilder.create({
      type: eventTypes.control.sysControl.type,
      source,
    })
      .mergeValues(values)
      .mergeData({ title: 'Run Get Threds' })
      .build();
  }

  static getResetPatternEvent(patternId: string, source: Event['source']) {
    const values: ResetPatternArgs = { op: systemEventTypes.operations.resetPattern, patternId };
    return EventBuilder.create({
      type: eventTypes.control.sysControl.type,
      source,
    })
      .mergeValues(values)
      .mergeData({ title: 'Run Reset Pattern' })
      .build();
  }

  // request to shutdown
  static getShutdownEvent(delay: number, source: Event['source']) {
    const values: ShutdownArgs = { op: systemEventTypes.operations.shutdown, delay };
    return EventBuilder.create({
      type: eventTypes.control.sysControl.type,
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
      source,
    })
      .mergeValues(values)
      .mergeData({ title: 'Run Terminat All Threds' })
      .build();
  }

  /***
   *        ___      _            ___
   *       /   \__ _| |_ __ _    /___\_ __  ___
   *      / /\ / _` | __/ _` |  //  // '_ \/ __|
   *     / /_// (_| | || (_| | / \_//| |_) \__ \
   *    /___,' \__,_|\__\__,_| \___/ | .__/|___/
   *                                 |_|
   */

  static getSavePatternEvent(pattern: PatternModel, source: Event['source']) {
    return EventBuilder.create({
      type: eventTypes.control.dataControl.type,
      source,
    })
      .mergeTasks({ name: 'storePattern', op: 'create', params: { type: 'PatternModel', values: pattern } })
      .mergeData({ title: `Store Pattern ${pattern.name}` })
      .build();
  }

  static getFindPatternEvent(patternId: string, source: Event['source']) {
    return EventBuilder.create({
      type: eventTypes.control.dataControl.type,
      source,
    })
      .mergeTasks({ name: 'findPattern', op: 'findOne', params: { type: 'PatternModel', matcher: { id: patternId } } })
      .mergeData({ title: 'Find Pattern' })
      .build();
  }

  static getUpdatePatternEvent(patternId: string, source: Event['source'], updateValues: EventTaskParams['values']) {
    return EventBuilder.create({
      type: eventTypes.control.dataControl.type,
      source,
    })
      .mergeTasks({
        name: 'updatePattern',
        op: 'update',
        params: {
          type: 'PatternModel',
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
      source,
    })
      .mergeTasks([
        { name: 'deletePattern', op: 'delete', params: { type: 'PatternModel', matcher: { id: patternId } } },
      ])
      .mergeData({ title: 'Delete Pattern' })
      .build();
  }

}
