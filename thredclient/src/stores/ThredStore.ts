import { observable, makeObservable } from 'mobx';
import { Event, SystemEvents } from 'thredlib';
import { RootStore } from './RootStore';
import { Thred } from '../core/Thred';
import { EventsStore } from './EventsStore';

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

  terminateThred = () => {
    const userId = this.rootStore.authStore.userId;
    if (!userId) throw Error('userId not found');

    const terminateThredEvent = SystemEvents.getTerminateThredEvent(this.thred.id, {
      id: userId,
      name: userId,
    });

    this.rootStore.connectionStore.exchange(terminateThredEvent, event => {
      // For now, we just remove the thred from the thredStore and unselect it
      this.rootStore.adminThredsStore.removeThred(this.thred.id);
      this.rootStore.adminThredsStore.unselectThred();

      this.rootStore.thredsStore.removeThred(this.thred.id);
      this.rootStore.thredsStore.unselectThred();
    });
  };
}
