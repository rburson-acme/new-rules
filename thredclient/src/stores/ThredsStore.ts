import { observable, action, computed, makeObservable, toJS } from 'mobx';
import { Event } from 'thredlib';
import { RootStore } from './RootStore';
import { ThredStore } from './ThredStore';
import { Thred } from '../core/Thred';
import { SystemEvents } from 'thredlib/lib/core/SystemEvents';

export class ThredsStore {
  thredStores: ThredStore[] = [];
  searchText: string = '';

  constructor(readonly rootStore: RootStore) {
    makeObservable(this, {
      thredStores: observable,
      addThred: action,
      numThreds: computed,
      removeThred: action,
      searchText: observable,
      setSearchText: action,
      filteredThreds: computed,
    });
  }

  async fetchAllThreds(userId: string) {
    const getThredsEvent = SystemEvents.getGetUserThredsEvent({ id: userId, name: userId }, 'active');

    const thredsEvent = await new Promise<any>((resolve, reject) => {
      this.rootStore.connectionStore.exchange(getThredsEvent, event => {
        resolve(event);
      });
    });

    const threds = thredsEvent.data?.content?.values?.threds || [];

    this.thredStores = threds.map((thred: any) => new ThredStore(thred, this.rootStore));
  }

  addThred(thred: Thred) {
    this.thredStores = [...this.thredStores, new ThredStore(thred, this.rootStore)];

    return this.thredStores[this.thredStores.length - 1];
  }

  publish(event: Event) {
    this.rootStore.connectionStore.publish(event);
  }

  removeThred(thredId: string) {
    this.thredStores = this.thredStores.filter(thredStore => thredStore.thred.id !== thredId);
  }

  setSearchText(text: string) {
    this.searchText = text;
  }

  get filteredThreds() {
    if (!this.searchText) return this.thredStores;
    return this.thredStores.filter(thredStore => {
      return thredStore.thred.meta.label?.includes(this.searchText);
    });
  }

  get numThreds(): number {
    return Object.keys(this.thredStores).length;
  }
}
