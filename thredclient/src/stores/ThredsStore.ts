import { observable, action, computed, autorun, makeObservable } from 'mobx';
import { StringMap, Logger, EventManager, Event } from 'thredlib';
import { RootStore } from './rootStore';
import { ThredStore } from './ThredStore';
import { Thred } from '../core/Thred';

export class ThredsStore {
  thredStores: StringMap<ThredStore> = {};
  currentThredId?: string = undefined;

  private eventManager: EventManager;

  constructor(readonly rootStore: RootStore) {
    makeObservable(this, {
      thredStores: observable.shallow,
      currentThredId: observable,
      addThred: action,
      selectThred: action,
      numThreds: computed,
      currentThredStore: computed,
    });

    this.eventManager = new EventManager();
    this.eventManager.consumers.add(this.consume);
  }

  addThred(thred: Thred) {
    this.thredStores[thred.id] = new ThredStore(thred, this.rootStore);
    // @TODO - this can should be removed once we have a thred panel on the side for user selection
    // this will need to change later - this automatically selects a new thred
    this.selectThred(thred.id);
  }

  selectThred(thredId: string) {
    this.currentThredId = thredId;
  }

  get currentThredStore(): ThredStore | undefined {
    const { thredStores, currentThredId } = this;
    return currentThredId ? thredStores[currentThredId] : undefined;
  }

  get numThreds(): number {
    return Object.keys(this.thredStores).length;
  }

  consume = (event: Event) => {
    const { thredId } = event;
    if (!thredId) throw Error(`Event missing thredId ${event}`);
    if (!this.thredStores[thredId]) {
      this.addThred({ id: thredId, name: thredId });
    }
    this.thredStores[thredId].addEvent(event);
  };

  publish(event: Event) {
    this.eventManager?.dispatch(event);
  }

  // @todo build seperate authentication using threds/events
  connect(userId: string) {
    this.eventManager
      .connect('http://10.0.2.2:3000', { transports: ['websocket'], jsonp: false, auth: { token: userId } })
      //this.engine.connect('http://proximl.com:3000', { transports: ['websocket'], jsonp: false, auth: { token: userId } })
      .catch(e => {
        Logger.error(e);
      })
      .then(() => {});
  }
}