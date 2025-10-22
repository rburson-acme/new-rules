import { systemEventTypes, eventTypes, ThredId } from './types.js';
import { EventBuilder } from './EventBuilder.js';
import { Operations } from '../task/Operations.js';
import { Types } from '../persistence/types.js';
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
    static getTransitionThredEvent(thredId, transition, source) {
        const values = { op: systemEventTypes.operations.transitionThred, thredId, transition };
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
    static getTerminateThredEvent(thredId, source) {
        const values = { op: systemEventTypes.operations.terminateThred, thredId };
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
    static getGetThredsEvent(source, status, terminatedMatcher) {
        const values = { op: systemEventTypes.operations.getThreds, status, terminatedMatcher };
        return EventBuilder.create({
            type: eventTypes.control.sysControl.type,
            thredId: ThredId.SYSTEM,
            source,
        })
            .mergeValues(values)
            .mergeData({ title: 'Run Get Threds' })
            .build();
    }
    static getWatchThredsEvent(source, directive) {
        const values = { op: systemEventTypes.operations.watchThreds, directive };
        return EventBuilder.create({
            type: eventTypes.control.sysControl.type,
            thredId: ThredId.SYSTEM,
            source,
        })
            .mergeValues(values)
            .mergeData({ title: 'Run Watch Threds' })
            .build();
    }
    static getReloadPatternEvent(patternId, source) {
        const values = { op: systemEventTypes.operations.reloadPattern, patternId };
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
    static getShutdownEvent(delay, source) {
        const values = { op: systemEventTypes.operations.shutdown, delay };
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
    static getTerminateAllThredsEvent(source) {
        const values = { op: systemEventTypes.operations.terminateAllThreds };
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
    static getSavePatternEvent(pattern, source) {
        return EventBuilder.create({
            type: eventTypes.control.dataControl.type,
            thredId: ThredId.SYSTEM,
            source,
        })
            .mergeTasks({ name: 'storePattern', op: Operations.PUT_OP, params: { type: Types.PatternModel, values: pattern } })
            .mergeData({ title: `Store Pattern ${pattern.name}` })
            .build();
    }
    static getFindPatternEvent(patternId, source) {
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
    static getFindAllPatternsEvent(source) {
        return EventBuilder.create({
            type: eventTypes.control.dataControl.type,
            thredId: ThredId.SYSTEM,
            source,
        })
            .mergeTasks({ name: 'findAllPatterns', op: Operations.GET_OP, params: { type: Types.PatternModel } })
            .mergeData({ title: 'Find All Patterns' })
            .build();
    }
    static getFindPatternsEvent(matcher, source) {
        return EventBuilder.create({
            type: eventTypes.control.dataControl.type,
            thredId: ThredId.SYSTEM,
            source,
        })
            .mergeTasks({ name: 'findPatterns', op: Operations.GET_OP, params: { type: Types.PatternModel, matcher } })
            .mergeData({ title: 'Find Patterns' })
            .build();
    }
    static getUpdatePatternEvent(patternId, source, updateValues) {
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
    static getDeletePatternEvent(patternId, source) {
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
    static getEventsForThredEvent(thredId, source) {
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
    static getFindEventsEvent(matcher, source) {
        return EventBuilder.create({
            type: eventTypes.control.dataControl.type,
            thredId: ThredId.SYSTEM,
            source,
        })
            .mergeTasks({ name: 'findEvents', op: Operations.GET_OP, params: { type: Types.EventRecord, matcher } })
            .mergeData({ title: 'Find Events' })
            .build();
    }
    static getThredLogForThredEvent(thredId, source) {
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
    static getGetUserThredsEvent(source, status, terminatedMatcher) {
        const values = { op: systemEventTypes.operations.user.getThreds, status, terminatedMatcher };
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
    static getGetUserEventsEvent(thredId, source) {
        const values = { op: systemEventTypes.operations.user.getEvents, thredId };
        return EventBuilder.create({
            type: eventTypes.control.userControl.type,
            thredId: ThredId.SYSTEM,
            source,
        })
            .mergeValues(values)
            .mergeData({ title: 'Run Get User Events' })
            .build();
    }
    static getGetSystemSpecEvent(source) {
        const values = { op: systemEventTypes.operations.user.getSystemSpec };
        return EventBuilder.create({
            type: eventTypes.control.userControl.type,
            thredId: ThredId.SYSTEM,
            source,
        })
            .mergeValues(values)
            .mergeData({ title: 'Run Get System Spec' })
            .build();
    }
}
