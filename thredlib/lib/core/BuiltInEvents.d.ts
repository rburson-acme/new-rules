import { Event, EventValues } from './Event.js';
/***
 *       ___       _ _ _   _           __                 _      _____                   _
 *      / __\_   _(_) | |_(_)_ __     /__\_   _____ _ __ | |_    \_   \_ __  _ __  _   _| |_
 *     /__\// | | | | | __| | '_ \   /_\ \ \ / / _ \ '_ \| __|    / /\/ '_ \| '_ \| | | | __|
 *    / \/  \ |_| | | | |_| | | | | //__  \ V /  __/ | | | |_  /\/ /_ | | | | |_) | |_| | |_
 *    \_____/\__,_|_|_|\__|_|_| |_| \__/   \_/ \___|_| |_|\__| \____/ |_| |_| .__/ \__,_|\__|
 *                                                                          |_|
 */
export declare class BuiltInEvents {
    static getBroadcastMessageEvent(thredId: string, source: Event['source'], message: string): Event;
}
/***
 *       ___       _ _ _   _           __                                        _____
 *      / __\_   _(_) | |_(_)_ __     /__\ ___  ___ _ __   ___  _ __  ___  ___  /__   \_   _ _ __   ___  ___
 *     /__\// | | | | | __| | '_ \   / \/// _ \/ __| '_ \ / _ \| '_ \/ __|/ _ \   / /\/ | | | '_ \ / _ \/ __|
 *    / \/  \ |_| | | | |_| | | | | / _  \  __/\__ \ |_) | (_) | | | \__ \  __/  / /  | |_| | |_) |  __/\__ \
 *    \_____/\__,_|_|_|\__|_|_| |_| \/ \_/\___||___/ .__/ \___/|_| |_|___/\___|  \/    \__, | .__/ \___||___/
 *                                                 |_|                                 |___/|_|
 */
export interface BroadcastCastMessage extends EventValues {
    valuesType: 'broadcastMessage' | 'broadcastValues';
    values: {
        messageSource: Event['source'];
    } & ({
        message: string;
    } | Record<string, any>);
}
