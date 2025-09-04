import { Event } from 'thredlib';
import { observable, action, computed, makeObservable } from 'mobx';
import { EventStore } from './EventStore';
import { RootStore } from './RootStore';

export enum ScrollMode {
  FREE,
  AUTO,
}
export class EventsStore {
  scrollMode: ScrollMode = ScrollMode.AUTO;
  unseenEvents: number = 0;
  eventStores: Array<EventStore> = [];
  openEventStore?: EventStore = undefined;

  constructor(private rootStore: RootStore) {
    makeObservable(this, {
      scrollMode: observable,
      unseenEvents: observable,
      eventStores: observable.shallow,
      setScrollMode: action,
      numberOfEvents: computed,
      resetUnseenEvents: action,
      addEvent: action,
      openEventStore: observable.shallow,
      setOpenEventStore: action,
      closeOpenEventStore: action,
    });
  }

  setScrollMode(scrollMode: ScrollMode) {
    this.scrollMode = scrollMode;
  }

  get numberOfEvents() {
    return this.eventStores.length;
  }

  resetUnseenEvents() {
    this.unseenEvents = 0;
  }

  clearEvents() {
    this.eventStores.forEach(eventStore => eventStore.close());
    this.eventStores = [];
  }

  addEvent(event: Event): void {
    if (this.scrollMode === ScrollMode.FREE || this.openEventStore) {
      this.unseenEvents = this.unseenEvents + 1;
    }
    this.eventStores.push(new EventStore(event, this.rootStore));
  }

  get latestEventStore() {
    return this.eventStores?.slice(-1)[0]?.event;
  }

  setOpenEventStore(eventStore: EventStore) {
    this.openEventStore = eventStore;
    eventStore.seen = true;
  }

  closeOpenEventStore() {
    this.openEventStore?.close();
    this.openEventStore = undefined;
  }
}
