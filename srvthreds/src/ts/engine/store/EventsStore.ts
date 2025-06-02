import { Event } from '../../thredlib/index.js';

export class EventsStore {
  addEvent(event: Event) {}
}

export interface EventStoreState {
  event: Event;
  thredId: string;
  timestamp: number;
  transition?: string;
  inception?: boolean;
  orphan?: boolean;
  error?: string;
}
