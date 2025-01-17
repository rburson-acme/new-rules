import {observable, action, computed, autorun, makeObservable} from 'mobx';
import {EventsStore} from './EventsStore';
import {Engine} from '../engine/Engine';
import {StringMap, Event, Logger} from 'thredlib';
import {Thred} from '../engine/Thred';
import {EventStore} from './EventStore';
import {RootStore} from './rootStore';

export class ThredStore {
  eventsStore: EventsStore | undefined = undefined;

  constructor(readonly thred: Thred, readonly rootStore: RootStore) {
    makeObservable(this, {
      eventsStore: observable.shallow,
    });

    this.eventsStore = new EventsStore(rootStore);
  }

  addEvent = (event: Event) => {
    this.eventsStore!.addEvent(event);
  };
}
