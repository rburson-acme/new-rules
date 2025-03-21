import { errorCodes, errorKeys, Event, Logger as L, Message, Series } from '../thredlib/index.js';

import { ThredsStore } from './store/ThredsStore.js';
import { ThredStore } from './store/ThredStore.js';
import { Pattern } from './Pattern.js';
import { Thred } from './Thred.js';
import { ThredContext } from './ThredContext.js';
import { Dispatcher } from './Dispatcher.js';
import { PersistenceManager as Pm } from './persistence/PersistenceManager.js';
import { EventThrowable } from '../thredlib/core/Errors.js';
import { NO_PATTERN_MATCH, NO_THRED } from '../thredlib/persistence/ThredLogRecord.js';
import { MessageTemplate } from './MessageTemplate.js';

/*
  Threds are synchronized in this class. ThredStores are locked here on a per-thredId basis.
  No two events with the same thredId should be processed at the same time.
*/
export class Threds {
  constructor(
    readonly thredsStore: ThredsStore,
    private readonly dispatcher: Dispatcher,
  ) {}

  async initialize(): Promise<void> {}

  // handleAttached and handleDetached are the two main entry point for Thred locking (per thredId)
  // locks are not reentrant so care should be taken not attempt to aquire a lock inside this operation
  consider(event: Event): Promise<void> {
    return event.thredId !== null && event.thredId != undefined
      ? this.handleBound(event.thredId, event)
      : this.handleUnbound(event);
  }

  async dispatch(messageTemplate: MessageTemplate, thredContext?: ThredContext): Promise<void> {
    return this.dispatcher.dispatch(messageTemplate, thredContext); // outbound messages with 'addressees'
  }

  shutdown(delay = 0): Promise<void> {
    return this.dispatcher.shutdown(delay);
  }

  // top-level lock here - 'withThredStore' will lock on a per-thredId basis
  // locks are not reentrant so care should be taken not attempt to aquire a lock inside this operation
  private async handleBound(thredId: string, event: Event): Promise<void> {
    await this.thredsStore.withThredStore(thredId, async (thredStore?: ThredStore) => {
      // @TODO @TEMP @DEMO // copy admin -----------
      // await this.dispatch({id: event.id, event, to: []});
      // -------------------------------------------
      if (!thredStore) {
        await Pm.get().saveThredLogRecord({ thredId, eventId: event.id, type: NO_THRED, timestamp: Date.now() });
        throw EventThrowable.get(
          `Thred ${thredId} does not, or no longer exists for event ${event.id} of type ${event.type}`,
          errorCodes[errorKeys.THRED_DOES_NOT_EXIST].code,
        );
      }
      return Thred.consider(event, thredStore, this);
    });
  }

  private async handleUnbound(event: Event): Promise<void> {
    const {
      patternsStore: { patterns },
    } = this.thredsStore;

    let matches = 0;
    // if pattern is applicable, start a thred and continue matching
    await Series.forEach<Pattern>(patterns, async (pattern) => {
      // don't want a failure to stop possible pattern matches
      try {
        if (await pattern.consider(event, new ThredContext())) {
          matches++;
          L.info(L.h2(`Pattern ${pattern.id} matched event ${event.id} of type ${event.type} - starting Thred`));
          return this.startThred(pattern, event);
        }
      } catch (e) {
        L.error(L.crit(`Error applying pattern ${pattern.id} to event ${event.id} of type ${event.type}: ${e}`));
      }
    });
    if (matches === 0) {
      // orphan event
      Pm.get().saveThredLogRecord({ eventId: event.id, type: NO_PATTERN_MATCH, timestamp: Date.now() });
      L.info(L.h2(`Unbound event ${event.id} of type ${event.type} matched no patterns`));
    }
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
