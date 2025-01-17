import { observable, makeObservable } from 'mobx';
import { EventsStore } from './EventsStore';
import { Event } from 'thredlib';
import { Thred } from '../engine/Thred';
import { RootStore } from './rootStore';

export class ThredStore {
  eventsStore?: EventsStore = undefined;

  constructor(readonly thred: Thred, readonly rootStore: RootStore) {
    makeObservable(this, {
      eventsStore: observable.shallow,
    });

    this.eventsStore = new EventsStore(rootStore);
  }

  addEvent = (event: Event) => {
    this.eventsStore?.addEvent(event);
  };
}
