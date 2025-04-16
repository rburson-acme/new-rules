import { EventBuilder } from "./EventBuilder.js";
import { eventTypes } from "./types.js";
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
