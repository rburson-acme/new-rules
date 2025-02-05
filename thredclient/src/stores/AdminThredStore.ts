import { action, makeObservable, observable, runInAction } from 'mobx';
import { PatternModel, SystemEvents } from 'thredlib';
import { RootStore } from './rootStore';
import { AdminThred } from '../core/AdminThred';
import { EventRecord } from '../core/EventRecord';

export class AdminThredStore {
  constructor(
    readonly thred: AdminThred,
    readonly rootStore: RootStore,
    readonly pattern: PatternModel,
    readonly events: EventRecord[],
  ) {
    makeObservable(this, {
      terminateThred: action,
      pattern: observable,
      events: observable,
      thred: observable,
    });
  }

  terminateThred = () => {
    const userId = this.getUserId();

    const terminateThredEvent = SystemEvents.getTerminateThredEvent(this.thred.id, {
      id: userId,
      name: userId,
    });

    this.rootStore.connectionStore.exchange(terminateThredEvent, () => {
      runInAction(() => {
        this.rootStore.adminThredsStore.removeThred(this.thred.id);
        this.rootStore.adminThredsStore.unselectThred();
        this.rootStore.thredsStore.removeThred(this.thred.id);
        this.rootStore.thredsStore.unselectThred();
      });
    });
  };

  private getUserId(): string {
    const userId = this.rootStore.authStore.userId;
    if (!userId) throw new Error('User ID not found');
    return userId;
  }
}
