import { Event, Message, Series } from '../thredlib/index.js';

import { ThredsStore } from './store/ThredsStore.js';
import { ThredStore } from './store/ThredStore.js';
import { Pattern } from './Pattern.js';
import { Thred } from './Thred.js';
import { ThredContext } from './ThredContext.js';
import { Dispatcher } from './Dispatcher.js';

/*
  Threds are synchronized in this class. ThredStores are locked here on a per-thredId basis.
  No two events with the same thredId should be processed at the same time.
*/
export class Threds {
  constructor(
    readonly thredsStore: ThredsStore,
    private readonly dispatcher: Dispatcher
  ) {}


  // a no-op for the base threds class
  async initialize(): Promise<void> { }

  // handleAttached and handleDetached are the two main entry point for Thred locking (per thredId)
  // locks are not reentrant so care should be taken not attempt to aquire a lock inside this operation
  consider(event: Event): Promise<void> {
    return event.thredId !== null && event.thredId != undefined
      ? this.handleAttached(event.thredId, event)
      : this.handleDetached(event);
  }

  async dispatch(message: Message): Promise<void> {
    return this.dispatcher.dispatch(message); // outbound messages with 'addressees'
  }

  shutdown(delay = 0): Promise<void> {
    return this.dispatcher.shutdown(delay);
  }

  // top-level lock here - 'withThredStore' will lock on a per-thredId basis
  // locks are not reentrant so care should be taken not attempt to aquire a lock inside this operation
  private async handleAttached(thredId: string, event: Event): Promise<void> {
    const { thredsStore } = this;
    await this.thredsStore.withThredStore(thredId, async (thredStore: ThredStore) => {

      // @TODO @TEMP @DEMO // copy admin -----------
      // await this.dispatch({id: event.id, event, to: []});
      // -------------------------------------------

      return Thred.consider(event, thredStore, this);
    });
  }

  private async handleDetached(event: Event): Promise<void> {
    const {
      eventStore,
      patternsStore: { patterns },
    } = this.thredsStore;
    // system event hook
    //if (SystemEvent.isSystemEvent(event)) return SystemEvent.handleSystemEvent({ event, threds: this });

    // if pattern is applicable, it will start the thread
    return await Series.forEach<Pattern>(patterns, async (pattern) => {
      if (await pattern.consider(event, new ThredContext())) {
        return this.startThred(pattern, event);
      }
    });
  }

  // top-level lock here - 'withNewThredStore' will lock on a per-thredId basis
  // locks are not reentrant so care should be taken not attempt to aquire a lock inside this operation
  private async startThred(pattern: Pattern, event: Event): Promise<void> {
    // Assign a thredId via a shallow copy of the event
    await this.thredsStore.withNewThredStore(pattern, async (thredStore: ThredStore) => {

      // @TODO @TEMP @DEMO (copy the admin user) ----
      //await this.dispatch({ id: event.id, event: { ...event, thredId: thredStore.id }, to: [] });
      // ---------------------------------------------

      return Thred.consider({ ...event, thredId: thredStore.id }, thredStore, this);
    });
  }

}
