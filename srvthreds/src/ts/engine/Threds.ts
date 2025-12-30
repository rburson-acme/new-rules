import {
  errorCodes,
  errorKeys,
  Events,
  Event,
  Logger as L,
  Series,
  ThredLogRecordType,
  addressToArray,
  ThredStatus,
} from '../thredlib/index.js';

import { ThredsStore } from './store/ThredsStore.js';
import { ThredStore } from './store/ThredStore.js';
import { Pattern } from './Pattern.js';
import { Thred } from './Thred.js';
import { ThredContext } from './ThredContext.js';
import { MessageHandler } from './MessageHandler.js';
import { SystemController as Sc } from '../persistence/controllers/SystemController.js';
import { EventThrowable } from '../thredlib/core/Errors.js';
import { MessageTemplate } from './MessageTemplate.js';
import { ThredThrowable } from './ThredThrowable.js';
import { T } from 'vitest/dist/chunks/environment.LoooBwUu.js';

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
  // locks are not reentrant so care should be taken not attempt to acquire a lock inside this operation
  consider(event: Event): Promise<void> {
    return event.thredId !== null && event.thredId != undefined
      ? this.handleBound(event.thredId, event)
      : this.handleUnbound(event);
  }

  async handleMessage(messageTemplate: MessageTemplate): Promise<void> {
    await Sc.get().replaceEvent({
      event: messageTemplate.event,
      to: addressToArray(messageTemplate.to),
      timestamp: Date.now(),
    });
    return this.messageHandler.handleMessage(messageTemplate); // outbound messages with 'addressees'
  }

  shutdown(delay = 0): Promise<void> {
    return this.messageHandler.shutdown(delay);
  }

  addThredToParticipants(thredId: string, participants: string[]): Promise<void> {
    return this.thredsStore.addThredToParticipantsStore(thredId, participants);
  }

  // top-level lock here - 'withThredStore' will lock on a per-thredId basis
  // locks are not reentrant so care should be taken not attempt to acquire a lock inside this operation
  private async handleBound(thredId: string, event: Event): Promise<void> {
    const timestamp = Date.now();
    // save the event before consideration
    await Sc.get().replaceEvent({ event: { ...event, thredId }, timestamp });
    const { thredStatus, patternId } = await this.thredsStore.withThredStore(
      thredId,
      async (thredStore?: ThredStore) => {
        // @TODO @TEMP @DEMO // copy admin -----------
        // await this.handleMessage{id: event.id, event, to: []});
        // -------------------------------------------
        if (!thredStore) {
          await Sc.get().saveThredLogRecord({
            thredId,
            eventId: event.id,
            type: ThredLogRecordType.NO_THRED,
            timestamp,
          });
          throw EventThrowable.get({
            message: `Thred ${thredId} does not, or no longer exists for event ${event.id} of type ${event.type}`,
            code: errorCodes[errorKeys.THRED_DOES_NOT_EXIST].code,
          });
        }
        // handle (and throw) incoming error events from agents
        this.throwErrorEvent(event, thredStore);

        // handle all other events
        await Thred.consider(event, thredStore, this);
        return { thredStatus: thredStore.status, patternId: thredStore.pattern.id };
      },
    );
    if (thredStatus === ThredStatus.TERMINATED)
      await this.thredsStore.patternsStore.decrementPatternInstanceCount(patternId);
  }

  private async handleUnbound(event: Event): Promise<void> {
    const { patternsStore } = this.thredsStore;
    const { patterns } = patternsStore;

    let matches = 0;
    // if pattern is applicable, start a thred and continue matching
    await Series.forEach<Pattern>(patterns, async (pattern) => {
      // don't want a failure to stop possible pattern matches
      try {
        if (await pattern.consider(event, new ThredContext())) {
          matches++;
          L.info({
            message: L.h2(`Pattern ${pattern.id} matched event ${event.id} of type ${event.type} - starting Thred`),
            thredId: event.thredId,
          });
          const thredStatus = await patternsStore.withLockForNewThread(pattern.id, async () => {
            return this.startThred(pattern, event);
          });
          if (thredStatus === ThredStatus.TERMINATED) await patternsStore.decrementPatternInstanceCount(pattern.id);
        }
      } catch (e) {
        L.error({
          message: L.crit(`Error applying pattern ${pattern.id} to event ${event.id} of type ${event.type}: ${e}`),
          thredId: event.thredId,
          err: e as Error,
        });
        throw EventThrowable.get({
          message: `Error applying pattern ${pattern.id} to event ${event.id} of type ${event.type}`,
          code: errorCodes[errorKeys.SERVER_ERROR].code,
          cause: e,
        });
      }
    });
    if (matches === 0) {
      // orphan event - no need to wait on this storage operation
      await Sc.get().replaceEvent({ event: { ...event }, timestamp: Date.now() });
      Sc.get().saveThredLogRecord({
        eventId: event.id,
        type: ThredLogRecordType.NO_PATTERN_MATCH,
        timestamp: Date.now(),
      });
      L.info({
        message: L.h2(`Unbound event ${event.id} of type ${event.type} matched no patterns`),
        thredId: event.thredId,
      });
    }
  }

  // top-level lock here - 'withNewThredStore' will lock on a per-thredId basis
  // locks are not reentrant so care should be taken not attempt to acquire a lock inside this operation
  private async startThred(pattern: Pattern, event: Event): Promise<ThredStatus> {
    // Assign a thredId via a shallow copy of the event
    return this.thredsStore.withNewThredStore(pattern, async (thredStore: ThredStore) => {
      // @TODO @TEMP @DEMO (copy the admin user) ----
      //await this.handleMessage({ id: event.id, event: { ...event, thredId: thredStore.id }, to: [] });
      // ---------------------------------------------
      // persist the event before consideration
      await Sc.get().replaceEvent({ event: { ...event, thredId: thredStore.id }, timestamp: Date.now() });
      await Thred.consider({ ...event, thredId: thredStore.id }, thredStore, this);
      return thredStore.status;
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
