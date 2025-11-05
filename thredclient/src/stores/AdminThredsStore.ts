import { SystemEvents, EventHelper, Thred, Event, EventManager, Events } from 'thredlib';
import { RootStore } from './RootStore';
import { action, computed, makeObservable, observable, runInAction } from 'mobx';
import { AdminThredStore } from './AdminThredStore';

type ValidTabs = 'all' | 'active' | 'inactive';
export class AdminThredsStore {
  threds: AdminThredStore[] = [];
  searchText: string = '';
  isComplete: boolean = false;
  tab: ValidTabs = 'active';
  private watchThredsEventId: string | null = null;
  private watchUnsubscribe: (() => void) | null = null;

  constructor(readonly rootStore: RootStore) {
    makeObservable(this, {
      getAllThreds: action,
      threds: observable.shallow,
      terminateAllThreds: action,
      removeThred: action,
      searchText: observable,
      setSearchText: action,
      filteredThreds: computed,
      isComplete: observable,
      tab: observable,
      setTab: action,
    });
  }

  removeThred(thredId: string) {
    this.threds = this.threds.filter(thred => thred.thred.id !== thredId);
  }

  addThred(thred: Thred) {
    const adminThredStore = new AdminThredStore(thred, this.rootStore);
    this.threds = [...this.threds, adminThredStore];
    return adminThredStore;
  }

  attachEventToThred(thredId: string, event: Event) {
    const adminThredStore = this.threds.find(thred => thred.thred.id === thredId);
    if (adminThredStore) {
      adminThredStore.events = [...adminThredStore.events, event as any];
    }
  }

  watchThreds() {
    const userId = this.rootStore.authStore.userId;
    if (!userId) throw Error('userId not found');
    const watchThredsEvent = SystemEvents.getWatchThredsEvent({ id: userId, name: userId }, 'start');
    this.watchThredsEventId = watchThredsEvent.id;
    this.rootStore.connectionStore.publish(watchThredsEvent);
    // Subscribe to watch threds events with filter for the watch event ID
    this.watchUnsubscribe = this.rootStore.connectionStore.subscribeToWatchThreds(
      this.handleWatchThredsEvent,
      watchThredsEvent.id,
    );
  }

  private handleWatchThredsEvent = (event: Event) => {
    const values = event.data?.content?.values as Record<string, any>;
    const threds = values.threds as Thred[];
    if (!threds) return;
    const thred = threds[0];
    //does thred already exist?
    const adminThredStore = this.threds.find(thredStore => thredStore.thred.id === thred.id);
    if (adminThredStore) {
      //remove from store
      this.removeThred(thred.id);
      this.addThred(thred);
    } else {
      this.addThred(thred);
    }
  };

  renewWatchThreds() {
    const userId = this.rootStore.authStore.userId;
    if (!userId) throw Error('userId not found');
    const watchThredsEvent = SystemEvents.getWatchThredsEvent({ id: userId, name: userId }, 'renew');
    this.rootStore.connectionStore.publish(watchThredsEvent);
  }

  stopWatchThreds() {
    const userId = this.rootStore.authStore.userId;
    if (!userId) throw Error('userId not found');
    const stopWatchThredsEvent = SystemEvents.getWatchThredsEvent({ id: userId, name: userId }, 'stop');
    this.rootStore.connectionStore.publish(stopWatchThredsEvent);

    // Clean up subscription
    if (this.watchUnsubscribe) {
      this.watchUnsubscribe();
      this.watchUnsubscribe = null;
    }
  }

  terminateAllThreds() {
    const userId = this.rootStore.authStore.userId;
    if (!userId) throw Error('userId not found');

    const terminateAllThredsEvent = SystemEvents.getTerminateAllThredsEvent({
      id: userId,
      name: userId,
    });

    this.rootStore.connectionStore.exchange(terminateAllThredsEvent, event => {
      // For now, we just remove all threds from the thredStore and AdminThredsStore
      this.rootStore.thredsStore.thredStores = [];
      this.threds = [];
    });
  }

  setTab(tab: ValidTabs) {
    this.tab = tab;
  }

  setSearchText(text: string) {
    this.searchText = text;
  }

  get filteredThreds() {
    switch (this.tab) {
      case 'all':
        return this.threds.filter(thred => {
          return thred.thred.meta.label?.includes(this.searchText);
        });
      case 'active':
        return this.threds.filter(thred => {
          return thred.thred.meta.label?.includes(this.searchText) && thred.thred.status === 'a';
        });
      case 'inactive':
        return this.threds.filter(thred => {
          return thred.thred.meta.label?.includes(this.searchText) && thred.thred.status === 't';
        });
    }
  }

  async getAllThreds() {
    const userId = this.rootStore.authStore.userId;
    if (!userId) throw Error('userId not found');

    const getAllThredsEvent = SystemEvents.getGetThredsEvent(
      {
        id: userId,
        name: userId,
      },
      'all',
    );

    const thredsEvent = await new Promise<any>((resolve, reject) => {
      this.rootStore.connectionStore.exchange(getAllThredsEvent, event => {
        resolve(event);
      });
    });

    const eventHelper = new EventHelper(thredsEvent);
    const threds = eventHelper.valueNamed('threds') as Thred[];

    const newThreds = await Promise.all(
      threds.map(async thred => {
        return new AdminThredStore(thred, this.rootStore);
      }),
    );

    runInAction(() => {
      this.threds = newThreds;
      this.isComplete = true;
    });
  }
}
