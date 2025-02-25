import { PatternModel, SystemEvents } from 'thredlib';
import { RootStore } from './RootStore';
import { action, makeObservable, observable, runInAction, toJS } from 'mobx';
import { set } from 'lodash';

export class PatternStore {
  constructor(public pattern: PatternModel, readonly rootStore: RootStore) {
    makeObservable(this, {
      pattern: observable,
      updatePatternValue: action,
    });
  }

  updatePattern(updateValues: any) {
    const userId = this.getUserId();
    const patternId = this.getPatternId();

    const updatePatternEvent = SystemEvents.getUpdatePatternEvent(
      patternId,
      { id: userId, name: userId },
      updateValues,
    );

    this.rootStore.connectionStore.exchange(updatePatternEvent, event => {});
  }

  updatePatternValue(updatePath: string, value: any) {
    runInAction(() => {
      set(this.pattern, updatePath, value);
    });
  }

  deletePattern() {
    const userId = this.getUserId();
    const patternId = this.getPatternId();

    const deletePatternEvent = SystemEvents.getDeletePatternEvent(patternId, { id: userId, name: userId });

    this.rootStore.connectionStore.exchange(deletePatternEvent, () => {
      runInAction(() => {
        this.rootStore.patternsStore.removePattern(patternId);
      });
    });
  }

  private getUserId(): string {
    const userId = this.rootStore.authStore.userId;
    if (!userId) throw new Error('User ID not found');
    return userId;
  }

  private getPatternId(): string {
    const patternId = this.pattern.id;
    if (!patternId) throw new Error('Pattern ID not found');
    return patternId;
  }
}
