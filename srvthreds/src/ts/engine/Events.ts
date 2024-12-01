import { Event, EventContent, EventError, Events as EventsLib, eventTypes } from "../thredlib";

export class Events {

    static newEventFromEvent({
    prevEvent,
    title,
    result,
    error,
  }: {
    prevEvent: Event;
    result?: EventContent;
    title?: string;
    error?: EventError['error'];
  }) {
    const content = error ? { error } : result;

    return EventsLib.newEvent({
      type: eventTypes.system.type,
      re: prevEvent.id,
      data: {
        ...{ title },
        content,
      },
      source: { ...eventTypes.system.source },
      thredId: prevEvent.thredId,
    });
  };
}