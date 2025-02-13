import { SystemEvents, EventHelper, Thred } from 'thredlib';
import { RootStore } from './RootStore';
import { action, computed, makeObservable, observable, runInAction } from 'mobx';
import { AdminThredStore } from './AdminThredStore';

export class AdminThredsStore {
  threds: AdminThredStore[] = [];
  searchText: string = '';
  isComplete: boolean = false;

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
    });
  }

  removeThred(thredId: string) {
    this.threds = this.threds.filter(thred => thred.thred.id !== thredId);
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

  setSearchText(text: string) {
    this.searchText = text;
  }

  get filteredThreds() {
    if (!this.searchText) return this.threds;
    return this.threds.filter(thredStore => {
      return thredStore.thred.id.includes(this.searchText);
    });
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
