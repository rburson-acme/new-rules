import { Pattern } from '../Pattern.js';
import { PatternStore } from './PatternStore.js';
import { Lock, Storage, Types } from '../../storage/Storage.js';

// Pattern locking is handled here and should be contained to this class

export class PatternsStore {
  private patternStores: { [patternId: string]: PatternStore } = {};

  constructor(readonly storage: Storage) {}

  addPatterns(patterns: Pattern[]): void {
    patterns.forEach((pattern) => (this.patternStores[pattern.id] = new PatternStore(pattern)));
  }

  getPattern(patternId: string): Pattern {
    return this.patternStores[patternId]?.pattern;
  }

  patternStore(patternId: string): PatternStore {
    return this.patternStores[patternId];
  }

  get patterns(): Pattern[] {
    return Object.values(this.patternStores).map((patternStore) => patternStore.pattern);
  }

  get numThreds(): number {
    return Object.values(this.patternStores).reduce((total, patternStore) => total + patternStore.numThreds, 0);
  }

  // Note: if the locking here gets too complex, move the aquire logic out to a Patterns class (i.e. Threds and ThredStore)

  async thredStarted(patternId: string, lastStartTime: number): Promise<void> {
    await this.storage.aquire(
      [{ type: Types.Pattern, id: patternId }],
      [
        async () => {
          let patternStore;
          try {
            patternStore = await this.retrievePatternStore(patternId);
            patternStore.incNumThreds();
            patternStore.lastThredStart = lastStartTime;
            await this.savePatternStore(patternId);
          } catch (e) {
            patternStore?.decNumThreds();
            throw new Error(`Could not start thred for patternId ${patternId}`, { cause: e });
          }
        },
      ],
    );
  }

  async thredEnded(patternId: string): Promise<void> {
    await this.storage.aquire(
      [{ type: Types.Pattern, id: patternId }],
      [
        async () => {
          let patternStore;
          try {
            patternStore = await this.retrievePatternStore(patternId);
            patternStore.decNumThreds();
            if (patternStore?.numThreds === 0) {
              await this._resetPatternStore(patternId);
            } else {
              await this.savePatternStore(patternId);
            }
          } catch (e) {
            patternStore?.incNumThreds(); 
            throw new Error(`Could not end thred for patternId ${patternId}`, { cause: e });
          }
        },
      ],
    );
  }

  async resetPatternStore(patternId: string): Promise<void> {
    this.storage.aquire(
      [{ type: Types.Pattern, id: patternId }],
      [
        async () => {
          try {
            await this._resetPatternStore(patternId);
          } catch (e) {
            throw new Error(`Could not reset pattern store for patternId ${patternId}`, { cause: e });
          }
        },
      ],
    );
  }

  // Important - callers of most private methods should do so within a locked block

  private async _resetPatternStore(patternId: string): Promise<void> {
    const patternStore = this.patternStores[patternId];
    if (patternStore) {
      await this.storage.delete(Types.Pattern, patternId);
      this.patternStores[patternId] = patternStore.fromState({ numThreds: 0, lastThredStart: 0 });
    }
  }

  private async retrievePatternStore(patternId: string): Promise<PatternStore> {
    const state = await this.storage.retrieve(Types.Pattern, patternId);
    const patternStore = this.patternStores[patternId];
    if (!patternStore) throw new Error(`PatternStore for patternId ${patternId} not found`);
    if (state) this.patternStores[patternId] = patternStore.fromState(state);
    return patternStore;
  }

  private savePatternStore(patternId: string): Promise<void> {
    const patternStore = this.patternStores[patternId];
    return this.storage.save(Types.Pattern, patternStore.getState(), patternId);
  }
}
