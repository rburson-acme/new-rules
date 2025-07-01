import { observable, action, computed, makeObservable, toJS } from 'mobx';
import { Event, Thred } from 'thredlib';
import { RootStore } from './RootStore';
import { ThredStore } from './ThredStore';
import { SystemEvents } from 'thredlib/lib/core/SystemEvents';

export interface SimpleThred {
  id: string;
  name: string;
}

export type FlexibleThred = SimpleThred | Thred;

export function isFullThred(thred: FlexibleThred): thred is Thred {
  return 'patternId' in thred && 'status' in thred;
}

export function isSimpleThred(thred: FlexibleThred): thred is SimpleThred {
  return !isFullThred(thred);
}

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
    const getThredsEvent = SystemEvents.getGetUserThredsEvent({ id: userId, name: userId }, 'active');

    const thredsEvent = await new Promise<any>((resolve, reject) => {
      this.rootStore.connectionStore.exchange(getThredsEvent, event => {
        resolve(event);
      });
    });

    const threds = thredsEvent.data?.content?.values?.threds || [];

    this.thredStores = threds.map((thred: any) => new ThredStore(thred, this.rootStore));
  }

  setTab(tab: ValidTabs) {
    this.tab = tab;
  }

  addThred(thred: FlexibleThred) {
    this.thredStores = [...this.thredStores, new ThredStore(thred, this.rootStore)];

    return this.thredStores[this.thredStores.length - 1];
  }

  addSimpleThred(id: string, name: string) {
    const simpleThred: SimpleThred = { id, name };
    return this.addThred(simpleThred);
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

      const displayName = isFullThred(thred) ? thred.meta.label || thred.patternName || thred.id : thred.name;

      const matchesSearch = !this.searchText || displayName.toLowerCase().includes(this.searchText.toLowerCase());

      if (isSimpleThred(thred)) {
        return matchesSearch;
      }

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
