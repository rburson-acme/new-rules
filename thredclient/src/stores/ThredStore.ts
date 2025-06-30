import { observable, makeObservable, action, runInAction } from 'mobx';
import { BuiltInEvents, Event, EventHelper, SystemEvents, Thred } from 'thredlib';
import { RootStore } from './RootStore';
import { EventsStore } from './EventsStore';

export class ThredStore {
  eventsStore?: EventsStore = undefined;
  eventsLoaded: boolean = false;
  isLoadingEvents: boolean = false;

  constructor(readonly thred: Thred, readonly rootStore: RootStore) {
    makeObservable(this, {
      eventsStore: observable.shallow,
      eventsLoaded: observable,
      isLoadingEvents: observable,
      fetchEvents: action,
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

  // Lazy loading method to fetch events for this thred
  fetchEvents = async (): Promise<void> => {
    if (this.eventsLoaded || this.isLoadingEvents) return; // Don't fetch if already loaded or loading

    const userId = this.rootStore.authStore.userId;
    if (!userId) throw Error('userId not found');

    this.isLoadingEvents = true;

    return new Promise<void>((resolve, reject) => {
      const getEventsEvent = SystemEvents.getGetUserEventsEvent(this.thred.id, {
        id: userId,
        name: userId,
      });

      this.rootStore.connectionStore.exchange(getEventsEvent, event => {
        try {
          const eventHelper = new EventHelper(event);
          const events = eventHelper.valueNamed('events') || [];
          events.forEach((eventRecord: any) => {
            if (eventRecord.event) {
              this.addEvent(eventRecord.event);
            }
          });

          this.eventsLoaded = true;
          resolve();
        } catch (error) {
          console.error('Failed to fetch events for thred:', error);
          reject(error);
        } finally {
          runInAction(() => {
            this.isLoadingEvents = false;
          });
        }
      });
    });
  };
}
