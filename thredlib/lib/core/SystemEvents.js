import { systemEventTypes, eventTypes, ThredId } from './types.js';
import { EventBuilder } from './EventBuilder.js';
import { Spec } from '../task/Spec.js';
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
     *     __               ___            _             _
     *    / _\_   _ ___    / __\___  _ __ | |_ _ __ ___ | |
     *    \ \| | | / __|  / /  / _ \| '_ \| __| '__/ _ \| |
     *    _\ \ |_| \__ \ / /__| (_) | | | | |_| | | (_) | |
     *    \__/\__, |___/ \____/\___/|_| |_|\__|_|  \___/|_|
     *        |___/
     */
    static getGetThredsEvent(source, status, completedMatcher) {
        const values = { op: systemEventTypes.operations.getThreds, status, completedMatcher };
        return EventBuilder.create({
            type: eventTypes.control.sysControl.type,
            thredId: ThredId.SYSTEM,
            source,
        })
            .mergeValues(values)
            .mergeData({ title: 'Run Get Threds' })
            .build();
    } // build this out in client
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
    } // build this out in client
    // request to terminate all threds
    static getTerminateAllThredsEvent(source) {
        const values = { op: systemEventTypes.operations.terminateAllThreds };
        return EventBuilder.create({
            type: eventTypes.control.sysControl.type,
            thredId: ThredId.SYSTEM,
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
    static getSavePatternEvent(pattern, source) {
        return EventBuilder.create({
            type: eventTypes.control.dataControl.type,
            thredId: ThredId.SYSTEM,
            source,
        })
            .mergeTasks({ name: 'storePattern', op: Spec.PUT_OP, params: { type: 'PatternModel', values: pattern } })
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
            op: Spec.GET_ONE_OP,
            params: { type: 'PatternModel', matcher: { id: patternId } },
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
            .mergeTasks({ name: 'findAllPatterns', op: Spec.GET_OP, params: { type: 'PatternModel' } })
            .mergeData({ title: 'Find All Patterns' })
            .build();
    }
    static getFindPatternsEvent(matcher, source) {
        return EventBuilder.create({
            type: eventTypes.control.dataControl.type,
            thredId: ThredId.SYSTEM,
            source,
        })
            .mergeTasks({ name: 'findPatterns', op: Spec.GET_OP, params: { type: 'PatternModel', matcher } })
            .mergeData({ title: 'Find Patterns' })
            .build();
    }
    static getUpdatePatternEvent(patternId, source, updateValues) {
        console.log({ updateValues });
        return EventBuilder.create({
            type: eventTypes.control.dataControl.type,
            thredId: ThredId.SYSTEM,
            source,
        })
            .mergeTasks({
            name: 'updatePattern',
            op: Spec.UPDATE_OP,
            params: {
                type: 'PatternModel',
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
            { name: 'deletePattern', op: Spec.DELETE_OP, params: { type: 'PatternModel', matcher: { id: patternId } } },
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
            op: Spec.GET_OP,
            params: { type: 'EventRecord', matcher: { thredId }, collector: { sort: [{ field: 'timestamp' }] } },
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
            .mergeTasks({ name: 'findEvents', op: Spec.GET_OP, params: { type: 'EventRecord', matcher } })
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
            op: Spec.GET_OP,
            params: { type: 'ThredLogEntry', matcher: { thredId }, collector: { sort: [{ field: 'timestamp' }] } },
        })
            .mergeData({ title: 'Get ThredLog' })
            .build();
    }
}
