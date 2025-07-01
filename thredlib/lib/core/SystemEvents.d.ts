import { TransitionModel } from '../model/TransitionModel.js';
import { PatternModel } from '../model/PatternModel.js';
import { Event, EventTaskParams } from './Event.js';
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
    readonly status?: 'active' | 'terminated' | 'all';
    readonly terminatedMatcher?: EventTaskParams['matcher'];
}
export interface WatchThredsArgs extends SystemEventInputValues {
    directive?: 'start' | 'stop' | 'renew';
}
export interface ReloadPatternArgs extends SystemEventInputValues {
    readonly patternId: string;
}
export interface TerminateAllThredsArgs extends SystemEventInputValues {
}
export interface ShutdownArgs extends SystemEventInputValues {
    readonly delay: number;
}
export interface TransitionThredArgs extends SystemEventThredInputValues {
    readonly transition: TransitionModel;
}
export interface ExpireReactionArgs extends SystemEventThredInputValues {
    readonly reactionName: string;
}
export interface TerminateThreadArgs extends SystemEventThredInputValues {
}
export interface GetEventsArgs extends SystemEventThredInputValues {
}
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
    readonly status?: 'active' | 'terminated' | 'all';
    readonly terminatedMatcher?: EventTaskParams['matcher'];
}
export interface GetUserEventsArgs extends SystemEventThredInputValues {
}
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
export declare class SystemEvents {
    /***
     *       _       _           _         _____ _                  _     ___            _             _
     *      /_\   __| |_ __ ___ (_)_ __   /__   \ |__  _ __ ___  __| |   / __\___  _ __ | |_ _ __ ___ | |
     *     //_\\ / _` | '_ ` _ \| | '_ \    / /\/ '_ \| '__/ _ \/ _` |  / /  / _ \| '_ \| __| '__/ _ \| |
     *    /  _  \ (_| | | | | | | | | | |  / /  | | | | | |  __/ (_| | / /__| (_) | | | | |_| | | (_) | |
     *    \_/ \_/\__,_|_| |_| |_|_|_| |_|  \/   |_| |_|_|  \___|\__,_| \____/\___/|_| |_|\__|_|  \___/|_|
     *
     */
    static getTransitionThredEvent(thredId: string, transition: TransitionModel, source: Event['source']): Event;
    static getTerminateThredEvent(thredId: string, source: Event['source']): Event;
    /***
     *       _       _           _         __               ___            _             _
     *      /_\   __| |_ __ ___ (_)_ __   / _\_   _ ___    / __\___  _ __ | |_ _ __ ___ | |
     *     //_\\ / _` | '_ ` _ \| | '_ \  \ \| | | / __|  / /  / _ \| '_ \| __| '__/ _ \| |
     *    /  _  \ (_| | | | | | | | | | | _\ \ |_| \__ \ / /__| (_) | | | | |_| | | (_) | |
     *    \_/ \_/\__,_|_| |_| |_|_|_| |_| \__/\__, |___/ \____/\___/|_| |_|\__|_|  \___/|_|
     *                                        |___/
     */
    static getGetThredsEvent(source: Event['source'], status?: GetThredsArgs['status'], terminatedMatcher?: EventTaskParams['matcher']): Event;
    static getWatchThredsEvent(source: Event['source'], directive?: WatchThredsArgs['directive']): Event;
    static getReloadPatternEvent(patternId: string, source: Event['source']): Event;
    static getShutdownEvent(delay: number, source: Event['source']): Event;
    static getTerminateAllThredsEvent(source: Event['source']): Event;
    /***
     *       _       _           _            ___      _            ___
     *      /_\   __| |_ __ ___ (_)_ __      /   \__ _| |_ __ _    /___\_ __  ___
     *     //_\\ / _` | '_ ` _ \| | '_ \    / /\ / _` | __/ _` |  //  // '_ \/ __|
     *    /  _  \ (_| | | | | | | | | | |  / /_// (_| | || (_| | / \_//| |_) \__ \
     *    \_/ \_/\__,_|_| |_| |_|_|_| |_| /___,' \__,_|\__\__,_| \___/ | .__/|___/
     *                                                                 |_|
     */
    static getSavePatternEvent(pattern: PatternModel, source: Event['source']): Event;
    static getFindPatternEvent(patternId: string, source: Event['source']): Event;
    static getFindAllPatternsEvent(source: Event['source']): Event;
    static getFindPatternsEvent(matcher: EventTaskParams['matcher'], source: Event['source']): Event;
    static getUpdatePatternEvent(patternId: string, source: Event['source'], updateValues: EventTaskParams['values']): Event;
    static getDeletePatternEvent(patternId: string, source: Event['source']): Event;
    static getEventsForThredEvent(thredId: string, source: Event['source']): Event;
    static getFindEventsEvent(matcher: EventTaskParams['matcher'], source: Event['source']): Event;
    static getThredLogForThredEvent(thredId: string, source: Event['source']): Event;
    /***
     *                              ___            _             _     ___
     *     /\ /\  ___  ___ _ __    / __\___  _ __ | |_ _ __ ___ | |   /___\_ __  ___
     *    / / \ \/ __|/ _ \ '__|  / /  / _ \| '_ \| __| '__/ _ \| |  //  // '_ \/ __|
     *    \ \_/ /\__ \  __/ |    / /__| (_) | | | | |_| | | (_) | | / \_//| |_) \__ \
     *     \___/ |___/\___|_|    \____/\___/|_| |_|\__|_|  \___/|_| \___/ | .__/|___/
     *                                                                    |_|
     */
    static getGetUserThredsEvent(source: Event['source'], status?: GetUserThredsArgs['status'], terminatedMatcher?: EventTaskParams['matcher']): Event;
    static getGetUserEventsEvent(thredId: string, source: Event['source']): Event;
}
