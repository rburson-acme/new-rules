import { Event, EventContent, EventError, Events as EventsLib, eventTypes } from "../thredlib";

export class Events {

    static newEventFromEvent({
    prevEvent,
    title,
    content,
    error,
  }: {
    prevEvent: Event;
    content?: EventContent;
    title?: string;
    error?: EventError['error'];
  }) {
    const _content = error ? { error } : content;

    return EventsLib.newEvent({
      type: eventTypes.system.type,
      re: prevEvent.id,
      data: {
        ...{ title },
        content: _content,
      },
      source: { ...eventTypes.system.source },
      thredId: prevEvent.thredId,
    });
  };
}