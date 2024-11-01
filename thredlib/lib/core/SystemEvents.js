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
    // request to expire current thred reaction
    static getSystemExpireThredEvent(id, thredId, reactionName, source) {
        return Events.newEvent({
            id,
            type: eventTypes.control.thredControl.type,
            source,
            thredId,
            content: {
                values: {
                    op: systemEventTypes.operations.expireReaction,
                    reactionName
                }
            }
        });
    }
    // request to explicitly transition a thred to a new state
    static getSystemTransitionThredEvent(id, thredId, transition, source) {
        return Events.newEvent({
            id,
            type: eventTypes.control.thredControl.type,
            source,
            thredId,
            content: {
                values: {
                    op: systemEventTypes.operations.transitionThred,
                    transition
                }
            }
        });
    }
    // request to terminate a thred
    static getSystemTerminateThredEvent(id, thredId, source) {
        return Events.newEvent({
            id,
            type: eventTypes.control.thredControl.type,
            source,
            thredId,
            content: {
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
    static getResetPatternEvent(id, patternId, source) {
        return Events.newEvent({
            id,
            type: eventTypes.control.sysControl.type,
            source,
            content: {
                values: {
                    op: systemEventTypes.operations.resetPattern,
                    patternId
                }
            }
        });
    }
    // request to shutdown
    static getShutdownEvent(id, delay, source) {
        return Events.newEvent({
            id,
            type: eventTypes.control.sysControl.type,
            source,
            content: {
                values: {
                    op: systemEventTypes.operations.shutdown,
                    delay
                }
            }
        });
    }
    // request to terminate all threds
    static getTerminateAllThredsEvent(id, source) {
        return Events.newEvent({
            id,
            type: eventTypes.control.sysControl.type,
            source,
            content: {
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
    getStoreObjectEvent(id, source, objectType, obj) {
        return Events.newEvent({
            id,
            type: eventTypes.control.dataControl.type,
            source,
            content: {
                values: {
                    objectType,
                    obj
                }
            }
        });
    }
}
