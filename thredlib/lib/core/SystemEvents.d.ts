import { TransitionModel } from '../model/TransitionModel.js';
import { PatternModel } from '../model/PatternModel.js';
import { Event, EventTaskParams } from './Event.js';
export interface SystemEventInputValues {
    readonly op: string;
}
export interface SystemEventThredInputValues extends SystemEventInputValues {
    readonly thredId: string;
}
export interface GetThredsArgs extends SystemEventInputValues {
    readonly thredIds?: string[] | undefined;
    readonly status?: 'active' | 'completed' | 'all';
    readonly completedMatcher?: EventTaskParams['matcher'];
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
export declare class SystemEvents {
    /***
     *     _____ _                  _     ___            _             _
     *    /__   \ |__  _ __ ___  __| |   / __\___  _ __ | |_ _ __ ___ | |
     *      / /\/ '_ \| '__/ _ \/ _` |  / /  / _ \| '_ \| __| '__/ _ \| |
     *     / /  | | | | | |  __/ (_| | / /__| (_) | | | | |_| | | (_) | |
     *     \/   |_| |_|_|  \___|\__,_| \____/\___/|_| |_|\__|_|  \___/|_|
     *
     */
    static getTransitionThredEvent(thredId: string, transition: TransitionModel, source: Event['source']): Event;
    static getTerminateThredEvent(thredId: string, source: Event['source']): Event;
    /***
     *     __               ___            _             _
     *    / _\_   _ ___    / __\___  _ __ | |_ _ __ ___ | |
     *    \ \| | | / __|  / /  / _ \| '_ \| __| '__/ _ \| |
     *    _\ \ |_| \__ \ / /__| (_) | | | | |_| | | (_) | |
     *    \__/\__, |___/ \____/\___/|_| |_|\__|_|  \___/|_|
     *        |___/
     */
    static getGetThredsEvent(source: Event['source'], status?: GetThredsArgs['status'], completedMatcher?: EventTaskParams['matcher']): Event;
    static getReloadPatternEvent(patternId: string, source: Event['source']): Event;
    static getShutdownEvent(delay: number, source: Event['source']): Event;
    static getTerminateAllThredsEvent(source: Event['source']): Event;
    /***
     *        ___      _            ___
     *       /   \__ _| |_ __ _    /___\_ __  ___
     *      / /\ / _` | __/ _` |  //  // '_ \/ __|
     *     / /_// (_| | || (_| | / \_//| |_) \__ \
     *    /___,' \__,_|\__\__,_| \___/ | .__/|___/
     *                                 |_|
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
}
