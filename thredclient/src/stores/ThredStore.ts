import { observable, makeObservable } from 'mobx';
import { Event } from 'thredlib';
import { RootStore } from './rootStore';
import { Thred } from '../core/Thred';
import { EventsStore } from './EventsStore';

export class ThredStore {
  eventsStore?: EventsStore = undefined;

  constructor(
    readonly thred: Thred,
    readonly rootStore: RootStore,
  ) {
    makeObservable(this, {
      eventsStore: observable.shallow,
    });

    this.eventsStore = new EventsStore(rootStore);
  }

  addEvent = (event: Event) => {
    this.eventsStore?.addEvent(event);
  };
}
