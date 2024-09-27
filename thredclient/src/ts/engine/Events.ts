import { AuthStore } from "../store/AuthStore";
import { Id } from "./Id";

// @TODO - replace this with Events from 'thredlib'
export class Events {

    static newEventFromAdvice(authStore: AuthStore, advice: any, content: any, thredId?: string) {
        const sourceId = authStore.userId || '$unauth';
        const sourceName = authStore.name || '$anon';
        const { title, eventType } = advice;
        const resolvedTitle = title ? `${sourceId} responded to '${title}` : undefined;
        return Events.newEvent(authStore, { type: eventType, sourceId, sourceName, thredId, content, title: resolvedTitle });
    }

    static newEvent(authStore: AuthStore,
        { type, contentType = 'application/json', sourceId, sourceName, thredId, content, title, description }:
            { type: string, title?: string, description?: string, contentType?: string,
                sourceId: string, sourceName: string, thredId?: string, content?: any }) {

        const resolvedTitle = title ?? `${sourceId} (${sourceName || ''}) submission`
        const resolvedDescription = description ?? `Content delivered via ${sourceId} (${sourceName || ''})`

        const event = {
            id: Id.nextEventId(authStore.userId || '$unauth'),
            time: Date.now(),
            type,
            data: {
                title: resolvedTitle,
                description: resolvedDescription,
                contentType,
                content
            },
            source: {
                id: sourceId,
                name: sourceName
            },
            thredId
        };
        return event;
    }
}