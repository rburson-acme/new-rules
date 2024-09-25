import { Events } from "./Events.js";
import { systemEventTypes, eventTypes } from "./types.js";
export class SystemEvents {
    /***
    *     _____ _                  _     ___            _             _
    *    /__   \ |__  _ __ ___  __| |   / __\___  _ __ | |_ _ __ ___ | |
    *      / /\/ '_ \| '__/ _ \/ _` |  / /  / _ \| '_ \| __| '__/ _ \| |
    *     / /  | | | | | |  __/ (_| | / /__| (_) | | | | |_| | | (_) | |
    *     \/   |_| |_|_|  \___|\__,_| \____/\___/|_| |_|\__|_|  \___/|_|
    *
    */
    // request to timeout current thred reaction
    static getSystemTimeoutThredEvent(id, thredId, reactionName, sourceId, sourceName) {
        return Events.newEvent({
            id,
            type: eventTypes.control.type,
            sourceId,
            sourceName,
            thredId,
            content: {
                type: systemEventTypes.operationTypes.thredControl,
                values: {
                    op: systemEventTypes.operations.timeoutReaction,
                    reactionName
                }
            }
        });
    }
    // request to explicitly transition a thred to a new state
    static getSystemTransitionThredEvent(id, thredId, transition, sourceId, sourceName) {
        return Events.newEvent({
            id,
            type: eventTypes.control.type,
            sourceId,
            sourceName,
            thredId,
            content: {
                type: systemEventTypes.operationTypes.thredControl,
                values: {
                    op: systemEventTypes.operations.transitionThred,
                    transition
                }
            }
        });
    }
    // request to terminate a thred
    static getSystemTerminateThredEvent(id, thredId, sourceId, sourceName) {
        return Events.newEvent({
            id,
            type: eventTypes.control.type,
            sourceId,
            sourceName,
            thredId,
            content: {
                type: systemEventTypes.operationTypes.thredControl,
                values: {
                    op: systemEventTypes.operations.terminateThred
                }
            }
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
    static getResetPatternEvent(id, patternId, sourceId, sourceName) {
        return Events.newEvent({
            id,
            type: eventTypes.control.type,
            sourceId,
            sourceName,
            content: {
                type: systemEventTypes.operationTypes.sysControl,
                values: {
                    op: systemEventTypes.operations.resetPattern,
                    patternId
                }
            }
        });
    }
    // request to shutdown
    static getShutdownEvent(id, delay, sourceId, sourceName) {
        return Events.newEvent({
            id,
            type: eventTypes.control.type,
            sourceId,
            sourceName,
            content: {
                type: systemEventTypes.operationTypes.sysControl,
                values: {
                    op: systemEventTypes.operations.shutdown,
                    delay
                }
            }
        });
    }
    // request to terminate all threds
    static getTerminateAllThredsEvent(id, sourceId, sourceName) {
        return Events.newEvent({
            id,
            type: eventTypes.control.type,
            sourceId,
            sourceName,
            content: {
                type: systemEventTypes.operationTypes.sysControl,
                values: {
                    op: systemEventTypes.operations.terminateAllThreds,
                }
            }
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
    getStoreObjectEvent(id, sourceId, objectType, obj, sourceName) {
        return Events.newEvent({
            id,
            type: eventTypes.control.type,
            sourceId,
            sourceName,
            content: {
                type: systemEventTypes.operationTypes.storeObject,
                values: {
                    objectType,
                    obj
                }
            }
        });
    }
}
