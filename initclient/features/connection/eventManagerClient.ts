import { EventManager, Event } from 'thredlib';

// Singleton EventManager — one WebSocket connection for the lifetime of the app.
const eventManager = new EventManager();

type EventConsumer = (event: Event) => void;
const consumers: Set<EventConsumer> = new Set();

// Route all inbound events to registered consumers (e.g. threds feature).
eventManager.subscribe((event: Event) => {
  consumers.forEach((fn) => fn(event));
});

export const eventManagerClient = {
  connect: (url: string, options: object) => eventManager.connect(url, options),
  disconnect: () => eventManager.disconnect(),
  publish: (event: Event) => eventManager.publish(event),
  exchange: (event: Event, notifyFn: (event: Event) => void) =>
    eventManager.exchange(event, notifyFn),
  subscribe: (fn: EventConsumer, options?: { filter?: string }) =>
    eventManager.subscribe(fn, options),
  /** Register a consumer for all inbound push events. Returns an unsubscribe function. */
  addConsumer: (fn: EventConsumer) => {
    consumers.add(fn);
    return () => consumers.delete(fn);
  },
};
