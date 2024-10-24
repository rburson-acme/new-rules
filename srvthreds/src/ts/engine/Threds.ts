import { Event, Message, Series, Logger } from '../thredlib/index.js';

import { ThredsStore } from './store/ThredsStore.js';
import { ThredStore } from './store/ThredStore.js';
import { Engine } from './Engine.js';
import { Pattern } from './Pattern.js';
import { SystemEvent, SystemThredEvent } from './system/SystemEvent.js';
import { Thred } from './Thred.js';
import { ThredContext } from './ThredContext.js';

/*
  Threds are synchronized in this class. ThredStores are locked here on a per-thredId basis.
  No two events with the same thredId should be processed at the same time.
*/
export class Threds {
  constructor(
    readonly thredsStore: ThredsStore,
    private readonly engine: Engine,
  ) {}

  consider(event: Event): Promise<void> {
    return event.thredId !== null && event.thredId != undefined
      ? this.handleAttached(event.thredId, event)
      : this.handleDetached(event);
  }

  dispatch(message: Message) {
    this.engine.dispatch(message); // outbound messages with 'addressees'
  }

  shutdown(delay = 0): Promise<void> {
    return this.engine.shutdown(delay);
  }

  terminateAllThreds(): Promise<void> {
    return this.thredsStore.terminateAllThreds();
  }

  private async handleAttached(thredId: string, event: Event): Promise<void> {
    const { thredsStore } = this;
    return this.thredsStore.withThredStore(thredId, async (thredStore?: ThredStore) => {

      // @TODO @TEMP @DEMO // copy admin -----------
      this.dispatch({id: event.id, event, to: []});
      // -------------------------------------------

      if (!thredStore) {
        if (SystemThredEvent.isSystemThredEvent(event)) {
          SystemThredEvent.thredDoesNotExist(this, event);
        }
        Logger.warn(`Thred ${thredId} does not, or no longer exists`);
        return;
      }
      return Thred.consider(event, thredStore, this);
    });
  }

  private async handleDetached(event: Event): Promise<void> {
    const {
      eventStore,
      patternsStore: { patterns },
    } = this.thredsStore;
    // system event hook
    if (SystemEvent.isSystemEvent(event)) return SystemEvent.handleSystemEvent({ event, threds: this });

    // if pattern is applicable, it will start the thread
    return await Series.forEach<Pattern>(patterns, async (pattern) => {
      if (await pattern.consider(event, new ThredContext())) {
        return this.startThred(pattern, event);
      }
    });
  }

  private async startThred(pattern: Pattern, event: Event): Promise<void> {
    // Assign a thredId via a shallow copy of the event
    await this.thredsStore.withNewThredStore(pattern, async (thredStore: ThredStore) => {

      // @TODO @TEMP @DEMO (copy the admin user) ----
      this.dispatch({ id: event.id, event: { ...event, thredId: thredStore.id }, to: [] });
      // ---------------------------------------------

      return Thred.consider({ ...event, thredId: thredStore.id }, thredStore, this);
    });
  }
}
