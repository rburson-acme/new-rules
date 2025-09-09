import { observable, action, computed, makeObservable } from 'mobx';
import { Event } from 'thredlib';
import { RootStore } from './RootStore';
import { ThredStore } from './ThredStore';
import { GetUserThredsResult, SystemEvents } from 'thredlib/lib/core/SystemEvents';
import { Thred } from '../core/Thred';

type ValidTabs = 'active' | 'inactive';
export class ThredsStore {
  thredStores: ThredStore[] = [];
  searchText: string = '';
  tab: ValidTabs = 'active';

  constructor(readonly rootStore: RootStore) {
    makeObservable(this, {
      thredStores: observable,
      addThred: action,
      numThreds: computed,
      removeThred: action,
      searchText: observable,
      setSearchText: action,
      filteredThreds: computed,
      tab: observable,
      setTab: action,
    });
  }

  async fetchAllThreds(userId: string) {
    const getThredsEvent = SystemEvents.getGetUserThredsEvent({ id: userId, name: userId }, 'all');
    const thredsEvent = await new Promise<any>((resolve, reject) => {
      try {
        this.rootStore.connectionStore.exchange(getThredsEvent, event => {
          resolve(event);
        });
      } catch (err) {
        console.error('exchange failed:', err);
        reject(err);
      }
    });

    const response = thredsEvent.data?.content?.values as GetUserThredsResult;
    this.thredStores = response.results.map(result => {
      return new ThredStore(
        { id: result.thred.id, name: result.thred.id, status: result.thred.status },
        this.rootStore,
      );
    });
    response.results.forEach(result => {
      const thredStore = this.thredStores.find(thredStore => thredStore.thred.id === result.thred.id);
      if (thredStore && result.lastEvent) {
        thredStore.addEvent(result.lastEvent.event);
      }
    });
  }

  setTab(tab: ValidTabs) {
    this.tab = tab;
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
    return this.thredStores.filter(thredStore => {
      const thred = thredStore.thred;
      const lastEvent = thredStore.eventsStore?.eventStores[0]?.event;

      const displayName = lastEvent?.data?.title;
      const matchesSearch = !this.searchText || displayName?.toLowerCase().includes(this.searchText.toLowerCase());

      switch (this.tab) {
        case 'active':
          return matchesSearch && thred.status === 'a';
        case 'inactive':
          return matchesSearch && thred.status === 't';
        default:
          return matchesSearch;
      }
    });
  }

  get numThreds(): number {
    return Object.keys(this.thredStores).length;
  }
}
