import { TransitionModel } from "../model/TransitionModel.js";
import { Event } from "./Event.js";
export declare class SystemEvents {
    /***
    *     _____ _                  _     ___            _             _
    *    /__   \ |__  _ __ ___  __| |   / __\___  _ __ | |_ _ __ ___ | |
    *      / /\/ '_ \| '__/ _ \/ _` |  / /  / _ \| '_ \| __| '__/ _ \| |
    *     / /  | | | | | |  __/ (_| | / /__| (_) | | | | |_| | | (_) | |
    *     \/   |_| |_|_|  \___|\__,_| \____/\___/|_| |_|\__|_|  \___/|_|
    *
    */
    static getSystemTimeoutThredEvent(id: string, thredId: string, reactionName: string, source: Event['source']): Event;
    static getSystemTransitionThredEvent(id: string, thredId: string, transition: TransitionModel, source: Event['source']): Event;
    static getSystemTerminateThredEvent(id: string, thredId: string, source: Event['source']): Event;
    /***
    *     __               ___            _             _
    *    / _\_   _ ___    / __\___  _ __ | |_ _ __ ___ | |
    *    \ \| | | / __|  / /  / _ \| '_ \| __| '__/ _ \| |
    *    _\ \ |_| \__ \ / /__| (_) | | | | |_| | | (_) | |
    *    \__/\__, |___/ \____/\___/|_| |_|\__|_|  \___/|_|
    *        |___/
    */
    static getResetPatternEvent(id: string, patternId: string, source: Event['source']): Event;
    static getShutdownEvent(id: string, delay: number, source: Event['source']): Event;
    static getTerminateAllThredsEvent(id: string, source: Event['source']): Event;
    /***
    *        ___      _            ___
    *       /   \__ _| |_ __ _    /___\_ __  ___
    *      / /\ / _` | __/ _` |  //  // '_ \/ __|
    *     / /_// (_| | || (_| | / \_//| |_) \__ \
    *    /___,' \__,_|\__\__,_| \___/ | .__/|___/
    *                                 |_|
    */
    getStoreObjectEvent(id: string, source: Event['source'], objectType: string, obj: {}): Event;
}
