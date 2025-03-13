import { EventHelper, PatternModel, SystemEvents } from 'thredlib';
import { RootStore } from './RootStore';
import { action, computed, makeObservable, observable, runInAction } from 'mobx';
import { PatternStore } from './PatternStore';

export class PatternsStore {
  patterns: PatternStore[] = [];
  searchText: string = '';
  constructor(readonly rootStore: RootStore) {
    makeObservable(this, {
      patterns: observable,
      getAllPatterns: action,
      removePattern: action,
      searchText: observable,
      setSearchText: action,
      createPattern: action,
      filteredPatterns: computed,
    });
  }

  createPattern(pattern: PatternModel): Promise<string> {
    const userId = this.getUserId();
    const createPatternEvent = SystemEvents.getSavePatternEvent(pattern, { id: userId, name: userId });

    return new Promise((resolve, reject) => {
      this.rootStore.connectionStore.exchange(createPatternEvent, event => {
        try {
          const eventHelper = new EventHelper(event);
          const id = eventHelper.valueNamed('result')[0] as string;

          runInAction(() => {
            this.patterns = [...this.patterns, new PatternStore({ ...pattern, id }, this.rootStore)];
          });

          resolve(id);
        } catch (error) {
          reject(error);
        }
      });
    });
  }
  removePattern(patternId: string) {
    this.patterns = this.patterns.filter(pattern => pattern.pattern.id !== patternId);
  }

  get filteredPatterns() {
    return this.patterns.slice().filter(pattern => pattern.pattern.name.toLowerCase().includes(this.searchText));
  }

  setSearchText(text: string) {
    this.searchText = text;
  }

  async getAllPatterns() {
    const userId = this.getUserId();

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

  private getUserId(): string {
    const userId = this.rootStore.authStore.userId;
    if (!userId) throw new Error('User ID not found');
    return userId;
  }
}
