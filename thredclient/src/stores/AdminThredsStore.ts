import { SystemEvents, EventHelper, PatternModel, EventRecord, ThredLogRecord } from 'thredlib';
import { RootStore } from './RootStore';
import { action, computed, makeObservable, observable, runInAction } from 'mobx';
import { AdminThred } from '../core/AdminThred';
import { AdminThredStore } from './AdminThredStore';

export class AdminThredsStore {
  threds: AdminThredStore[] = [];
  searchText: string = '';
  currentThredId?: string = undefined;

  constructor(readonly rootStore: RootStore) {
    makeObservable(this, {
      getAllThreds: action,
      threds: observable.shallow,
      terminateAllThreds: action,
      removeThred: action,
      unselectThred: action,
      selectThred: action,
      currentThredId: observable,
      currentThredStore: computed,
      searchText: observable,
      setSearchText: action,
      filteredThreds: computed,
    });
  }

  removeThred(thredId: string) {
    this.threds = this.threds.filter(thred => thred.thred.id !== thredId);
  }

  unselectThred() {
    this.currentThredId = undefined;
  }

  selectThred(thredId: string) {
    this.currentThredId = thredId;
  }

  get currentThredStore(): AdminThredStore | undefined {
    const { threds, currentThredId } = this;

    return currentThredId ? threds.find(thred => thred.thred.id === currentThredId) : undefined;
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

    const getAllThredsEvent = SystemEvents.getGetThredsEvent({
      id: userId,
      name: userId,
    });

    const thredsEvent = await new Promise<any>((resolve, reject) => {
      this.rootStore.connectionStore.exchange(getAllThredsEvent, event => {
        resolve(event);
      });
    });

    const eventHelper = new EventHelper(thredsEvent);
    const threds = eventHelper.valueNamed('threds') as AdminThred[];

    const newThreds = await Promise.all(
      threds.map(async thred => {
        const [pattern, events, thredLogs] = await Promise.all([
          this.fetchPattern(userId, thred.patternId),
          this.fetchEvents(userId, thred.id),
          this.fetchThredLogs(userId, thred.id),
        ]);

        //attach thredLogs to events
        events.map(event => {
          event.thredLogs = thredLogs.filter(thredLog => thredLog.eventId === event.id);
        });

        return new AdminThredStore(thred, this.rootStore, pattern, events);
      }),
    );

    runInAction(() => {
      this.threds = newThreds;
    });
  }

  private async fetchThredLogs(userId: string, thredId: string): Promise<ThredLogRecord[]> {
    return new Promise(resolve => {
      const findEventDetailsEvent = SystemEvents.getThredLogForThredEvent(thredId, { id: userId, name: userId });

      return this.rootStore.connectionStore.exchange(findEventDetailsEvent, event => {
        const eventHelper = new EventHelper(event);
        resolve(eventHelper.valueNamed('result')[0] as ThredLogRecord[]);
      });
    });
  }

  private fetchEvents(userId: string, thredId: string): Promise<EventRecord[]> {
    return new Promise(resolve => {
      const findEventsEvent = SystemEvents.getEventsForThredEvent(thredId, { id: userId, name: userId });

      this.rootStore.connectionStore.exchange(findEventsEvent, event => {
        const eventHelper = new EventHelper(event);
        resolve(eventHelper.valueNamed('result')[0] as EventRecord[]);
      });
    });
  }

  private fetchPattern(userId: string, patternId: string): Promise<PatternModel> {
    return new Promise(resolve => {
      const findPatternEvent = SystemEvents.getFindPatternEvent(patternId, { id: userId, name: userId });

      this.rootStore.connectionStore.exchange(findPatternEvent, event => {
        const eventHelper = new EventHelper(event);
        resolve(eventHelper.valueNamed('result')[0] as PatternModel);
      });
    });
  }
}
