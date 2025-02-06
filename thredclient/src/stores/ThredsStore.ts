import { observable, action, computed, makeObservable } from 'mobx';
import { Event } from 'thredlib';
import { RootStore } from './RootStore';
import { ThredStore } from './ThredStore';
import { Thred } from '../core/Thred';

// TODO: Change StringMap to just an array of ThredStore
export class ThredsStore {
  thredStores: ThredStore[] = [];
  currentThredId?: string = undefined;
  searchText: string = '';

  constructor(readonly rootStore: RootStore) {
    makeObservable(this, {
      thredStores: observable,
      currentThredId: observable,
      addThred: action,
      selectThred: action,
      numThreds: computed,
      currentThredStore: computed,
      unselectThred: action,
      removeThred: action,
      searchText: observable,
      setSearchText: action,
      filteredThreds: computed,
    });
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

  unselectThred() {
    this.currentThredId = undefined;
  }

  selectThred(thredId: string) {
    this.currentThredId = thredId;
  }

  setSearchText(text: string) {
    this.searchText = text;
  }

  get filteredThreds() {
    if (!this.searchText) return this.thredStores;
    return this.thredStores.filter(thredStore => {
      return thredStore.thred.name.includes(this.searchText);
    });
  }

  get currentThredStore(): ThredStore | undefined {
    const { thredStores, currentThredId } = this;

    return thredStores.find(thredStore => thredStore.thred.id === currentThredId);
  }

  get numThreds(): number {
    return Object.keys(this.thredStores).length;
  }
}
