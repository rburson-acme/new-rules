;
export class Events {
    static newEventFromAdvice(advice, params) {
        if (!advice || !params)
            throw Error(`Neither advice nor params can be null`);
        const { id, content, contentType, thredId, sourceId, sourceName } = params;
        const { title, eventType } = advice;
        const resolvedTitle = title ? `${sourceId} responded to '${title}` : undefined;
        return Events.newEvent({ id, type: eventType, sourceId, sourceName, thredId, content, contentType, title: resolvedTitle });
    }
    static newEvent(params) {
        const { id, type, contentType, sourceId, sourceName, thredId, content, title, description } = params;
        const resolvedTitle = title ?? `Event from ${sourceId} ${sourceName || ''}`;
        // const resolvedDescription = description ?? `Content delivered via ${sourceId} (${sourceName || ''})`
        const event = {
            id,
            time: Date.now(),
            type,
            data: {
                title: resolvedTitle,
                description,
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
    static getDataContent(event) {
        return event?.data?.content;
    }
}
