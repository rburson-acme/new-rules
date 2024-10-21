import { DataContent, Event } from "./Event.js";

export interface EventParams {
    id: string, type: string, title?: string, description?: string, contentType?: string,
    source: Event['source'], thredId?: string, content?: any
};

export class Events {


    static newEvent(params: EventParams): Event {

        const { id, type, contentType, source, thredId, content, title, description } = params
        const { id: sourceId, name: sourceName, uri: sourceUri } = source;
        const resolvedTitle = title ?? `Event from ${sourceId} ${sourceName || ''}`
        const resolvedDescription = description ?? `Content delivered via ${sourceId} (${sourceName || ''})`

        const event = {
            id,
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
                name: sourceName,
                uri: sourceUri
            },
            thredId
        };
        return event;
    }

    static getDataContent(event: Event): DataContent {
        return event?.data?.content;
    }
}

    