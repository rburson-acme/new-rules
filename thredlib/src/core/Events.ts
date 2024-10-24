import { EventContent, Event, EventData } from './Event.js';

export interface EventParams {
  id: string;
  type: string;
  title?: string;
  description?: string;
  contentType?: string;
  source: Event['source'];
  thredId?: string;
  content?: any;
}

export class Events {
  static newEvent(params: EventParams): Event {
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

  static getData(event: Event): EventData | undefined {
    return event?.data;
  }

  static getAdvice(event: Event): EventData['advice'] | undefined {
    return this.getData(event)?.advice;
  }

  static getContent(event: Event): EventContent | undefined {
    return this.getData(event)?.content;
  }

  static getValues(event: Event): EventContent['values'] | undefined {
    return this.getContent(event)?.values;
  }

  static valueNamed(event: Event, name: string) {
    const values = this.getValues(event);
    if (Array.isArray(values)) {
      return values.find((value) => value[name]);
    }
    return values?.[name];
  }
}

export class EventHelper {
  constructor(readonly event: Event) {}
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
  valueNamed(name: string) {
    return Events.valueNamed(this.event, name);
  }
}
