import { errorCodes, errorKeys, Events, Event, Logger as L, Message, Series, ThredLogRecordType } from '../thredlib/index.js';

import { ThredsStore } from './store/ThredsStore.js';
import { ThredStore } from './store/ThredStore.js';
import { Pattern } from './Pattern.js';
import { Thred } from './Thred.js';
import { ThredContext } from './ThredContext.js';
import { MessageHandler } from './MessageHandler.js';
import { SystemController as Pm, SystemController } from '../persistence/controllers/SystemController.js';
import { EventThrowable } from '../thredlib/core/Errors.js';
import { MessageTemplate } from './MessageTemplate.js';
import { Events as EngineEvents } from './Events.js';
import { ThredThrowable } from './ThredThrowable.js';

/**
 * The Threds class is the main entry point for dispatching Events to Threds (existing or new).
 * Events with a thredId are 'bound' while those without are 'unbound'
 * Existing Threds are found by thredId. New Threds are created by matching the Events with Patterns
 * Threds are synchronized in this class (using the withThredStore methods of the ThredStore). ThredStores are locked here on a per-thredId basis.
 * No two events with the same thredId should be processed at the same time.
*/
export class Threds {
  constructor(
    readonly thredsStore: ThredsStore,
    private readonly messageHandler: MessageHandler,
  ) {}

  async initialize(): Promise<void> {}

  // handleAttached and handleDetached are the two main entry point for Thred locking (per thredId)
  // locks are not reentrant so care should be taken not attempt to aquire a lock inside this operation
  consider(event: Event): Promise<void> {
    return event.thredId !== null && event.thredId != undefined
      ? this.handleBound(event.thredId, event)
      : this.handleUnbound(event);
  }

  async handleMessage(messageTemplate: MessageTemplate): Promise<void> {
    return this.messageHandler.handleMessage(messageTemplate); // outbound messages with 'addressees'
  }

  shutdown(delay = 0): Promise<void> {
    return this.messageHandler.shutdown(delay);
  }

  addThredToParticipants(thredId: string, participants: string[]): Promise<void> {
    return this.thredsStore.addThredToParticipantsStore(thredId, participants);
  }

  // top-level lock here - 'withThredStore' will lock on a per-thredId basis
  // locks are not reentrant so care should be taken not attempt to aquire a lock inside this operation
  private async handleBound(thredId: string, event: Event): Promise<void> {
    await this.thredsStore.withThredStore(thredId, async (thredStore?: ThredStore) => {
      // @TODO @TEMP @DEMO // copy admin -----------
      // await this.handleMessage{id: event.id, event, to: []});
      // -------------------------------------------
      const timestamp = Date.now();
      if (!thredStore) {
        await Pm.get().saveThredLogRecord({ thredId, eventId: event.id, type: ThredLogRecordType.NO_THRED, timestamp });
        throw EventThrowable.get({
          message: `Thred ${thredId} does not, or no longer exists for event ${event.id} of type ${event.type}`,
          code: errorCodes[errorKeys.THRED_DOES_NOT_EXIST].code,
        });
      }
      // handle (and throw) incoming error events from agents
      this.throwErrorEvent(event, thredStore);

      // handle all other events
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
        throw EventThrowable.get({
          message: `Error applying pattern ${pattern.id} to event ${event.id} of type ${event.type}`,
          code: errorCodes[errorKeys.SERVER_ERROR].code,
          cause: e,
        });
      }
    });
    if (matches === 0) {
      // orphan event - no need to wait on this storage operation
      Pm.get().saveThredLogRecord({ eventId: event.id, type: ThredLogRecordType.NO_PATTERN_MATCH, timestamp: Date.now() });
      L.info(L.h2(`Unbound event ${event.id} of type ${event.type} matched no patterns`));
    }
  }

  // top-level lock here - 'withNewThredStore' will lock on a per-thredId basis
  // locks are not reentrant so care should be taken not attempt to aquire a lock inside this operation
  private async startThred(pattern: Pattern, event: Event): Promise<void> {
    // Assign a thredId via a shallow copy of the event
    await this.thredsStore.withNewThredStore(pattern, async (thredStore: ThredStore) => {
      // @TODO @TEMP @DEMO (copy the admin user) ----
      //await this.handleMessage({ id: event.id, event: { ...event, thredId: thredStore.id }, to: [] });
      // ---------------------------------------------
      return Thred.consider({ ...event, thredId: thredStore.id }, thredStore, this);
    });
  }

  private throwErrorEvent(event: Event, thredStore: ThredStore): void {
    const error = Events.getError(event);
    if (error) {
      // @TODO once agent config is available - verify event is allowed (i.e. from one of the agents)
      // report the error event to the $thred
      throw ThredThrowable.get(error, 'thred', thredStore.thredContext);
    }
  }
}
