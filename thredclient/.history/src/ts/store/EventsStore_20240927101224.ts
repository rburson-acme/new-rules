
import { Event, eventTypes } from 'thredlib';
import { observable, action, computed, makeObservable } from 'mobx';
import { EventStore } from './EventStore';
import { RootStore } from './rootStore';

export enum ScrollMode {
  FREE,
  AUTO
}
export class EventsStore {

  scrollMode: ScrollMode = ScrollMode.AUTO;
  unseenEvents: number = 0;
  eventStores: Array<EventStore> = [];
  openEventStore?: EventStore;

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
      closeOpenEventStore: action
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

  addEvent(event: Event): void {
    if (this.scrollMode === ScrollMode.FREE) {
      this.unseenEvents = this.unseenEvents + 1;
    }
    this.eventStores.push(new EventStore(event, this.rootStore));
  }

  setOpenEventStore(eventStore: EventStore) {
    this.openEventStore = eventStore;
  }

  closeOpenEventStore() {
    this.openEventStore?.close();
    this.openEventStore = undefined;
  }

}