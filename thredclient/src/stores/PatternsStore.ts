import { EventHelper, PatternModel, SystemEvents } from 'thredlib';
import { RootStore } from './RootStore';
import { action, makeObservable, observable, runInAction } from 'mobx';
import { PatternStore } from './PatternStore';

export class PatternsStore {
  patterns: PatternStore[] = [];

  constructor(readonly rootStore: RootStore) {
    makeObservable(this, {
      patterns: observable.shallow,
      getAllPatterns: action,
      removePattern: action,
    });
  }

  removePattern(patternId: string) {
    this.patterns = this.patterns.filter(pattern => pattern.pattern.id !== patternId);
  }

  async getAllPatterns() {
    const userId = this.rootStore.authStore.userId;
    if (!userId) throw Error('userId not found');

    const getAllPatternsEvent = SystemEvents.getFindAllPatternsEvent({
      id: userId,
      name: userId,
    });

    const patternsEvent = await new Promise<any>((resolve, reject) => {
      this.rootStore.connectionStore.exchange(getAllPatternsEvent, event => {
        resolve(event);
      });
    });

    const eventHelper = new EventHelper(patternsEvent);

    const patterns = eventHelper.valueNamed('result')[0] as PatternModel[];
    runInAction(() => {
      this.patterns = patterns.map(pattern => {
        return new PatternStore(pattern, this.rootStore);
      });
    });
  }
}
