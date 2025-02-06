import { observable, action, computed, makeObservable } from 'mobx';
import { Event, StringMap } from 'thredlib';
import { RootStore } from './RootStore';
import { ThredStore } from './ThredStore';
import { Thred } from '../core/Thred';

export class ThredsStore {
  thredStores: StringMap<ThredStore> = {};
  currentThredId?: string = undefined;

  constructor(readonly rootStore: RootStore) {
    makeObservable(this, {
      thredStores: observable.shallow,
      currentThredId: observable,
      addThred: action,
      selectThred: action,
      numThreds: computed,
      currentThredStore: computed,
      unselectThred: action,
      removeThred: action,
    });
  }

  addThred(thred: Thred) {
    this.thredStores[thred.id] = new ThredStore(thred, this.rootStore);
  }

  publish(event: Event) {
    this.rootStore.connectionStore.publish(event);
  }
  removeThred(thredId: string) {
    delete this.thredStores[thredId];
  }

  unselectThred() {
    this.currentThredId = undefined;
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
}
