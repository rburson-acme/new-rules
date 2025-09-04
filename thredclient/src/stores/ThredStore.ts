import { observable, makeObservable, action, runInAction } from 'mobx';
import { BuiltInEvents, Event, EventHelper, SystemEvents } from 'thredlib';
import { RootStore } from './RootStore';
import { EventsStore } from './EventsStore';
import { Thred } from '../core/Thred';

type EventEntry = {
  event: any;
  hasResponse?: boolean;
  responseValues?: Record<string, any>;
};

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

    this.rootStore.connectionStore.exchange(terminateThredEvent, () => {
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
      this.eventsStore?.clearEvents();
      const getEventsEvent = SystemEvents.getGetUserEventsEvent(this.thred.id, {
        id: userId,
        name: userId,
      });

      this.rootStore.connectionStore.exchange(getEventsEvent, event => {
        try {
          const eventHelper = new EventHelper(event);
          const events = eventHelper.valueNamed('events') || [];

          const eventMap = this.buildEventMap(events);

          this.processEventMap(eventMap);

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

  private buildEventMap(events: any[]) {
    const eventMap = new Map<string, EventEntry>();
    events.forEach((eventRecord: any) => {
      if (!eventRecord.event) return;

      const evt = eventRecord.event;
      const values = evt?.data?.content?.values;

      // If this event references another event
      if (values && typeof values === 'object' && 're' in values) {
        const reId = values.re as string;

        const referenced = eventMap.get(reId);
        if (referenced) {
          eventMap.set(reId, {
            ...referenced,
            hasResponse: true,
            responseValues: values,
          });
        }
      }

      eventMap.set(evt.id, { event: evt });
    });
    return eventMap;
  }

  private processEventMap(eventMap: Map<string, EventEntry>) {
    const filteredEvents: any[] = [];

    eventMap.forEach(entry => {
      const evt = entry.event;
      const values = evt?.data?.content?.values;

      let shouldKeep = true;

      // Case 1: broadcast-style response (re inside values)
      if (values && typeof values === 'object' && 're' in values) {
        this.handleBroadcastResponse(evt);
      }

      // Case 2: user-submitted response (re directly on event)
      if ('re' in evt) {
        this.handleUserResponse(evt);
        shouldKeep = false;
      }

      if (shouldKeep) {
        const eventStore = this.addEvent(evt);
        filteredEvents.push(eventStore);
      }
    });
  }

  private handleBroadcastResponse(event: Event) {
    const values = event.data?.content?.values;
    if (values && typeof values === 'object' && 're' in values) {
      const reId = values.re as string;
      const referenced = this.eventsStore?.eventStores.find(eventStore => eventStore.event?.id === reId);

      if (referenced) {
        referenced.openTemplateStore?.interactionStores.forEach(interactionStore => {
          interactionStore.markCompletedExternally();
        });
      }
    }
  }

  private handleUserResponse(event: Event) {
    const reId = event.re as string;
    const referenced = this.eventsStore?.eventStores.find(eventStore => eventStore.event?.id === reId);
    const responseValues = event.data?.content?.values;

    if (referenced?.openTemplateStore) {
      const normalizedValues: Record<string, any>[] = !responseValues
        ? []
        : Array.isArray(responseValues)
        ? responseValues
        : [responseValues]; // wrap single object into an array

      referenced.openTemplateStore.interactionStores.forEach(interactionStore => {
        normalizedValues.forEach(obj => {
          Object.entries(obj).forEach(([key, value]) => {
            interactionStore.setValueFromHistory(key, value);
          });
        });
      });
    }
  }
}
