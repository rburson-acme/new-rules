import { action, makeObservable, observable, runInAction } from 'mobx';
import { EventHelper, EventRecord, PatternModel, SystemEvents, Thred, ThredLogRecord, ThredRecord } from 'thredlib';
import { RootStore } from './RootStore';
import { AdminEvent } from '../core/AdminEvent';

export class AdminThredStore {
  pattern: PatternModel | undefined = undefined;
  events: AdminEvent[] = [];
  isFullThred: boolean = false;
  constructor(readonly thred: Thred, readonly rootStore: RootStore) {
    makeObservable(this, {
      terminateThred: action,
      pattern: observable,
      events: observable,
      thred: observable,
      isFullThred: observable,
      completeThred: action,
    });
  }

  async completeThred() {
    const userId = this.getUserId();
    const [pattern, events, thredLogs] = await Promise.all([
      this.fetchPattern(userId, this.thred.patternId),
      this.fetchEvents(userId, this.thred.id),
      this.fetchThredLogs(userId, this.thred.id),
    ]);

    //attach thredLogs to events
    events.map(event => {
      event.thredLogs = thredLogs.filter(thredLog => thredLog.eventId === event.id);
    });

    this.pattern = pattern;
    this.events = events;
    this.isFullThred = true;
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
        this.rootStore.thredsStore.removeThred(this.thred.id);
        // TODO: Reroute user to thred list
      });
    });
  };

  private async fetchThredLogs(userId: string, thredId: string): Promise<ThredLogRecord[]> {
    return new Promise(resolve => {
      const findEventDetailsEvent = SystemEvents.getThredLogForThredEvent(thredId, { id: userId, name: userId });

      return this.rootStore.connectionStore.exchange(findEventDetailsEvent, event => {
        const eventHelper = new EventHelper(event);
        resolve(eventHelper.valueNamed('result')[0] as ThredLogRecord[]);
      });
    });
  }

  private fetchEvents(userId: string, thredId: string): Promise<AdminEvent[]> {
    return new Promise(resolve => {
      const findEventsEvent = SystemEvents.getEventsForThredEvent(thredId, { id: userId, name: userId });

      this.rootStore.connectionStore.exchange(findEventsEvent, event => {
        const eventHelper = new EventHelper(event);
        resolve(eventHelper.valueNamed('result')[0] as AdminEvent[]);
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

  private getUserId(): string {
    const userId = this.rootStore.authStore.userId;
    if (!userId) throw new Error('User ID not found');
    return userId;
  }
}
