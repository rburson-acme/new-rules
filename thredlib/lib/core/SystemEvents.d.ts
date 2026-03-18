import { TransitionModel } from '../model/TransitionModel.js';
import { PatternModel } from '../model/PatternModel.js';
import { Event, EventTaskParams } from './Event.js';
import { Thred } from './Thred.js';
import { EventRecord } from '../persistence/EventRecord.js';
import { SystemSpec } from '../index.js';
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
export interface ReloadAllPatternsArgs extends SystemEventInputValues {
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
export interface GetSystemSpecArgs extends SystemEventInputValues {
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
export interface GetSystemSpecResult extends SystemResult {
    op: string;
    status: string;
    systemSpec: SystemSpec;
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
    /**
     * Force a thred to execute a specific state transition.
     * Sends a sysControl event that bypasses normal pattern matching
     * and directly applies the given transition to the target thred.
     * @param thredId - The thred to transition
     * @param transition - The transition model defining the target state and actions
     * @param source - Identity of the caller
     */
    static getTransitionThredEvent(thredId: string, transition: TransitionModel, source: Event['source']): Event;
    /**
     * Terminate a single thred by ID.
     * The engine will stop the thred's state machine and mark it as terminated.
     * @param thredId - The thred to terminate
     * @param source - Identity of the caller
     */
    static getTerminateThredEvent(thredId: string, source: Event['source']): Event;
    /***
     *       _       _           _         __               ___            _             _
     *      /_\   __| |_ __ ___ (_)_ __   / _\_   _ ___    / __\___  _ __ | |_ _ __ ___ | |
     *     //_\\ / _` | '_ ` _ \| | '_ \  \ \| | | / __|  / /  / _ \| '_ \| __| '__/ _ \| |
     *    /  _  \ (_| | | | | | | | | | | _\ \ |_| \__ \ / /__| (_) | | | | |_| | | (_) | |
     *    \_/ \_/\__,_|_| |_| |_|_|_| |_| \__/\__, |___/ \____/\___/|_| |_|\__|_|  \___/|_|
     *                                        |___/
     */
    /**
     * Fetch threds from the engine (admin-level).
     * Returns thred metadata without event history. Use `status` to filter
     * by lifecycle state; defaults to 'active' if omitted.
     * @param source - Identity of the caller
     * @param status - Filter: 'active', 'terminated', or 'all'
     * @param terminatedMatcher - Optional matcher to further filter terminated threds
     */
    static getGetThredsEvent(source: Event['source'], status?: GetThredsArgs['status'], terminatedMatcher?: EventTaskParams['matcher']): Event;
    /**
     * Start, stop, or renew a real-time thred watch subscription. (admin-level)
     * When active, the server pushes thred lifecycle events (created, updated,
     * terminated) to the subscriber. The response event ID is used to filter
     * subsequent push events via the `re` (reply-to) field.
     * @param source - Identity of the caller
     * @param directive - 'start' to begin watching, 'stop' to end, 'renew' to extend
     */
    static getWatchThredsEvent(source: Event['source'], directive?: WatchThredsArgs['directive']): Event;
    /**
     * Reload a single pattern from persistence into the engine's active pattern set.
     * Used after a pattern has been updated in the database to make the engine
     * pick up the changes without a full restart.
     * @param patternId - The pattern to reload
     * @param source - Identity of the caller
     */
    static getReloadPatternEvent(patternId: string, source: Event['source']): Event;
    /**
     * Reload all patterns from persistence into the engine.
     * Replaces the engine's entire active pattern set with what is currently
     * stored in the database.
     * @param source - Identity of the caller
     */
    static getReloadAllPatternsEvent(source: Event['source']): Event;
    /**
     * Request a graceful engine shutdown.
     * The engine will stop accepting new events, allow in-flight threds to
     * complete (up to the delay), then shut down all agents and services.
     * @param delay - Milliseconds to wait before forcing shutdown
     * @param source - Identity of the caller
     */
    static getShutdownEvent(delay: number, source: Event['source']): Event;
    /**
     * Terminate all active threds in the engine.
     * Used for administrative cleanup or before shutdown.
     * @param source - Identity of the caller
     */
    static getTerminateAllThredsEvent(source: Event['source']): Event;
    /***
     *       _       _           _            ___      _            ___
     *      /_\   __| |_ __ ___ (_)_ __      /   \__ _| |_ __ _    /___\_ __  ___
     *     //_\\ / _` | '_ ` _ \| | '_ \    / /\ / _` | __/ _` |  //  // '_ \/ __|
     *    /  _  \ (_| | | | | | | | | | |  / /_// (_| | || (_| | / \_//| |_) \__ \
     *    \_/ \_/\__,_|_| |_| |_|_|_| |_| /___,' \__,_|\__\__,_| \___/ | .__/|___/
     *                                                                 |_|
     */
    /**
     * Persist a pattern to the database (create or overwrite).
     * Sends a dataControl event with a PUT operation for the PatternModel type.
     * @param pattern - The full pattern definition to store
     * @param source - Identity of the caller
     */
    static getSavePatternEvent(pattern: PatternModel, source: Event['source']): Event;
    /**
     * Fetch a single pattern by ID from the database.
     * @param patternId - The pattern to retrieve
     * @param source - Identity of the caller
     */
    static getFindPatternEvent(patternId: string, source: Event['source']): Event;
    /**
     * Fetch all patterns from the database.
     * @param source - Identity of the caller
     */
    static getFindAllPatternsEvent(source: Event['source']): Event;
    /**
     * Fetch patterns matching a query from the database.
     * @param matcher - Query criteria to filter patterns
     * @param source - Identity of the caller
     */
    static getFindPatternsEvent(matcher: EventTaskParams['matcher'], source: Event['source']): Event;
    /**
     * Update specific fields of an existing pattern in the database.
     * @param patternId - The pattern to update
     * @param source - Identity of the caller
     * @param updateValues - The fields and values to update
     */
    static getUpdatePatternEvent(patternId: string, source: Event['source'], updateValues: EventTaskParams['values']): Event;
    /**
     * Delete a pattern from the database.
     * Does not unload the pattern from the engine — call `getReloadAllPatternsEvent`
     * afterward to synchronize the engine's active set.
     * @param patternId - The pattern to delete
     * @param source - Identity of the caller
     */
    static getDeletePatternEvent(patternId: string, source: Event['source']): Event;
    /**
     * Fetch all persisted events for a specific thred, sorted by timestamp.
     * Returns EventRecords from the database (not live/in-memory events).
     * @param thredId - The thred whose events to retrieve
     * @param source - Identity of the caller
     */
    static getEventsForThredEvent(thredId: string, source: Event['source']): Event;
    /**
     * Fetch persisted events matching a query from the database.
     * @param matcher - Query criteria to filter events
     * @param source - Identity of the caller
     */
    static getFindEventsEvent(matcher: EventTaskParams['matcher'], source: Event['source']): Event;
    /**
     * Fetch the thred log (state transition history) for a specific thred,
     * sorted by timestamp. Useful for debugging thred behavior.
     * @param thredId - The thred whose log to retrieve
     * @param source - Identity of the caller
     */
    static getThredLogForThredEvent(thredId: string, source: Event['source']): Event;
    /***
     *                              ___            _             _     ___
     *     /\ /\  ___  ___ _ __    / __\___  _ __ | |_ _ __ ___ | |   /___\_ __  ___
     *    / / \ \/ __|/ _ \ '__|  / /  / _ \| '_ \| __| '__/ _ \| |  //  // '_ \/ __|
     *    \ \_/ /\__ \  __/ |    / /__| (_) | | | | |_| | | (_) | | / \_//| |_) \__ \
     *     \___/ |___/\___|_|    \____/\___/|_| |_|\__|_|  \___/|_| \___/ | .__/|___/
     *                                                                    |_|
     */
    /**
     * Fetch threds visible to the current user (user-level, not admin).
     * Returns threds the user is a participant in, along with the last event
     * for each thred. Unlike `getGetThredsEvent`, this is scoped to the
     * authenticated user's session.
     * @param source - Identity of the caller (used to determine participant scope)
     * @param status - Filter: 'active', 'terminated', or 'all'
     * @param terminatedMatcher - Optional matcher to further filter terminated threds
     */
    static getGetUserThredsEvent(source: Event['source'], status?: GetUserThredsArgs['status'], terminatedMatcher?: EventTaskParams['matcher']): Event;
    /**
     * Fetch events for a specific thred visible to the current user (user-level).
     * Only returns events the user is authorized to see based on their
     * participant role in the thred.
     * @param thredId - The thred whose events to retrieve
     * @param source - Identity of the caller
     */
    static getGetUserEventsEvent(thredId: string, source: Event['source']): Event;
    /**
     * Fetch the system specification, which describes the available patterns,
     * capabilities, and configuration of the running system.
     * @param source - Identity of the caller
     */
    static getGetSystemSpecEvent(source: Event['source']): Event;
}
