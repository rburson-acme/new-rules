import { TransitionModel } from "../model/TransitionModel.js";
export declare class SystemEvents {
    /***
    *     _____ _                  _     ___            _             _
    *    /__   \ |__  _ __ ___  __| |   / __\___  _ __ | |_ _ __ ___ | |
    *      / /\/ '_ \| '__/ _ \/ _` |  / /  / _ \| '_ \| __| '__/ _ \| |
    *     / /  | | | | | |  __/ (_| | / /__| (_) | | | | |_| | | (_) | |
    *     \/   |_| |_|_|  \___|\__,_| \____/\___/|_| |_|\__|_|  \___/|_|
    *
    */
    static getSystemTimeoutThredEvent(id: string, thredId: string, reactionName: string, sourceId: string, sourceName?: string): import("./Event.js").Event;
    static getSystemTransitionThredEvent(id: string, thredId: string, transition: TransitionModel, sourceId: string, sourceName?: string): import("./Event.js").Event;
    static getSystemTerminateThredEvent(id: string, thredId: string, sourceId: string, sourceName?: string): import("./Event.js").Event;
    /***
    *     __               ___            _             _
    *    / _\_   _ ___    / __\___  _ __ | |_ _ __ ___ | |
    *    \ \| | | / __|  / /  / _ \| '_ \| __| '__/ _ \| |
    *    _\ \ |_| \__ \ / /__| (_) | | | | |_| | | (_) | |
    *    \__/\__, |___/ \____/\___/|_| |_|\__|_|  \___/|_|
    *        |___/
    */
    static getResetPatternEvent(id: string, patternId: string, sourceId: string, sourceName?: string): import("./Event.js").Event;
    static getShutdownEvent(id: string, delay: number, sourceId: string, sourceName?: string): import("./Event.js").Event;
    static getTerminateAllThredsEvent(id: string, sourceId: string, sourceName?: string): import("./Event.js").Event;
    /***
    *        ___      _            ___
    *       /   \__ _| |_ __ _    /___\_ __  ___
    *      / /\ / _` | __/ _` |  //  // '_ \/ __|
    *     / /_// (_| | || (_| | / \_//| |_) \__ \
    *    /___,' \__,_|\__\__,_| \___/ | .__/|___/
    *                                 |_|
    */
    getStoreObjectEvent(id: string, sourceId: string, objectType: string, obj: {}, sourceName?: string): import("./Event.js").Event;
}
