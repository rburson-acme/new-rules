import { observable, makeObservable } from 'mobx';
import { BuiltInEvents, Event, SystemEvents } from 'thredlib';
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

  sendBroadcast = (message: string) => {
    const userId = this.rootStore.authStore.userId;
    if (!userId) throw Error('userId not found');
    const broadcastEvent = BuiltInEvents.getBroadcastMessageEvent(this.thred.id, { id: userId, name: userId }, message);
    this.rootStore.connectionStore.publish(broadcastEvent);
    console.log({ broadcastEvent });
    this.eventsStore?.addEvent(broadcastEvent);
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

      this.rootStore.thredsStore.removeThred(this.thred.id);
    });
  };
}
