import { Event, EventBuilder, EventContent, EventError, Events as EventsLib, eventTypes } from '../thredlib';

export class Events {
  static newEventFromEvent({
    prevEvent,
    title,
    content,
    error,
    type,
  }: {
    prevEvent: Event;
    content?: EventContent;
    title?: string;
    error?: EventError['error'];
    type?: string;
  }) {
    const _content = error ? { error } : content;
    const _title = title || prevEvent.data?.title;

    return EventsLib.newEvent({
      type: type || eventTypes.system.tell.type,
      re: prevEvent.id,
      data: {
        ...{ _title: title },
        content: _content,
      },
      source: { ...eventTypes.system.source },
      thredId: prevEvent.thredId,
    });
  }

  static baseSystemEventBuilder({ thredId, type, re }: { thredId: string; type?: string; re?: string }): EventBuilder {
    return EventBuilder.create({
      type: type || eventTypes.system.tell.type,
      source: eventTypes.system.source,
      thredId,
      ...(re && { re }),
    });
  }
}
