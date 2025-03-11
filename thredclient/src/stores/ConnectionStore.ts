import { Logger, EventManager, Event } from 'thredlib';
import { RootStore } from './RootStore';
import { Platform } from 'react-native';

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

  consume = (event: Event) => {
    const { thredId } = event;
    if (!thredId) throw Error(`Event missing thredId ${event}`);
    const thredStore = this.rootStore.thredsStore.thredStores.find(thredStore => thredStore.thred.id === thredId);
    if (event.data?.title?.includes('System Event')) return;
    if (!thredStore) {
      const thredStore = this.rootStore.thredsStore.addThred({ id: thredId, name: thredId });
      thredStore.addEvent(event);
    } else {
      thredStore.addEvent(event);
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
      //   Todo: change this to the actual url
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
}
