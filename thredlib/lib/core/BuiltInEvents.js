import { EventBuilder } from './EventBuilder.js';
import { eventTypes } from './types.js';
/***
 *       ___       _ _ _   _           __                 _      _____                   _
 *      / __\_   _(_) | |_(_)_ __     /__\_   _____ _ __ | |_    \_   \_ __  _ __  _   _| |_
 *     /__\// | | | | | __| | '_ \   /_\ \ \ / / _ \ '_ \| __|    / /\/ '_ \| '_ \| | | | __|
 *    / \/  \ |_| | | | |_| | | | | //__  \ V /  __/ | | | |_  /\/ /_ | | | | |_) | |_| | |_
 *    \_____/\__,_|_|_|\__|_|_| |_| \__/   \_/ \___|_| |_|\__| \____/ |_| |_| .__/ \__,_|\__|
 *                                                                          |_|
 */
export class BuiltInEvents {
    static getBroadcastMessageEvent(thredId, source, message) {
        const values = { message };
        return EventBuilder.create({
            type: eventTypes.client.broadcast.type,
            thredId,
            source,
        })
            .mergeValues(values)
            .mergeData({ title: `Broadcast from ${source.id}` })
            .build();
    }
}
