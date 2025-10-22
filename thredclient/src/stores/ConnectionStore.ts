import { Logger, EventManager, Event, ThredStatus } from 'thredlib';
import { RootStore } from './RootStore';
import { AppState, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

export class ConnectionStore {
  private eventManager: EventManager;
  hasConnection = false;

  constructor(readonly rootStore: RootStore) {
    this.eventManager = new EventManager();
    this.eventManager.subscribe(this.consume);
  }

  exchange = (event: Event, notifyFn: (event: Event) => void) => {
    this.eventManager?.exchange(event, notifyFn);
  };

  subscribeToWatchThreds = (notifyFn: (event: Event) => void, watchThredsEventId: string): (() => void) => {
    // Subscribe to events with filter for the watch threds event ID
    this.eventManager?.subscribe(notifyFn, {
      filter: `$event.re = '${watchThredsEventId}'`,
    });
    // Return a cleanup function
    return () => {
      // EventManager will handle cleanup internally
    };
  };

  consume = async (event: Event) => {
    const { thredId } = event;
    if (!thredId) throw Error(`Event missing thredId ${event}`);
    const thredStore = this.rootStore.thredsStore.thredStores.find(thredStore => thredStore.thred.id === thredId);
    if (event.data?.title?.includes('System Event')) return;

    const targetThredStore =
      thredStore ??
      this.rootStore.thredsStore.addThred({
        id: thredId,
        name: thredId,
        status: ThredStatus.ACTIVE,
      });

    targetThredStore.addEvent(event);

    // If this is a broadcast response, mark the referenced event as completedExternally
    const values = event.data?.content?.values;
    if (values && typeof values === 'object' && 're' in values) {
      const reId = values.re as string;

      const referenced = targetThredStore.eventsStore?.eventStores.find(evtStore => evtStore.event?.id === reId);

      if (referenced?.openTemplateStore) {
        referenced.openTemplateStore.interactionStores.forEach(interactionStore => {
          interactionStore.markCompletedExternally();
        });
      }
    }
    if (AppState.currentState !== 'active' && Platform.OS !== 'web') {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: event.data?.title ?? 'New Event',
          body: this.getNotificationBody(event),
          data: { eventId: event.id },
        },
        trigger: null, // fire immediately
      });
    }
  };

  publish(event: Event) {
    this.eventManager?.publish(event);
  }

  disconnect() {
    if (!this.hasConnection) return;
    this.eventManager.disconnect();
    this.hasConnection = false;
  }
  // @todo build seperate authentication using threds/events
  async connect(userId: string) {
    let url: string;

    if (Platform.OS === 'web') {
      // Todo: change this to the actual url
      url = 'localhost:3000';
    } else {
      url = 'http://10.0.2.2:3000';
    }
    if (this.hasConnection) return;
    await this.eventManager
      .connect(url, { transports: ['websocket'], jsonp: false, auth: { token: userId } })
      //this.engine.connect('http://proximl.com:3000', { transports: ['websocket'], jsonp: false, auth: { token: userId } })
      .catch(e => {
        Logger.error(e);
      })
      .then(() => {
        this.hasConnection = true;
        console.log('connected');
      });
  }

  private getNotificationBody(event: Event): string {
    const values = event.data?.content?.values;
    if (typeof values === 'string') return values;
    if (values) return JSON.stringify(values);
    return 'You have a new event.';
  }
}
