export class Events {
    static newEvent(params) {
        const { id, type, contentType, source, thredId, content, title, description } = params;
        const { id: sourceId, name: sourceName, uri: sourceUri } = source;
        const resolvedTitle = title ?? `Event from ${sourceId} ${sourceName || ''}`;
        const resolvedDescription = description ?? `Content delivered via ${sourceId} (${sourceName || ''})`;
        const event = {
            id,
            time: Date.now(),
            type,
            data: {
                title: resolvedTitle,
                description: resolvedDescription,
                contentType,
                content,
            },
            source: {
                id: sourceId,
                name: sourceName,
                uri: sourceUri,
            },
            thredId,
        };
        return event;
    }
    static getData(event) {
        return event?.data;
    }
    static getAdvice(event) {
        return this.getData(event)?.advice;
    }
    static getContent(event) {
        return this.getData(event)?.content;
    }
    static getValues(event) {
        return this.getContent(event)?.values;
    }
    static valueNamed(event, name) {
        const values = this.getValues(event);
        if (Array.isArray(values)) {
            return values.find((value) => value[name]);
        }
        return values?.[name];
    }
}
export class EventHelper {
    event;
    constructor(event) {
        this.event = event;
    }
    getData() {
        return Events.getData(this.event);
    }
    getAdvice() {
        return Events.getAdvice(this.event);
    }
    getContent() {
        return Events.getContent(this.event);
    }
    getValues() {
        return Events.getValues(this.event);
    }
    valueNamed(name) {
        return Events.valueNamed(this.event, name);
    }
}
