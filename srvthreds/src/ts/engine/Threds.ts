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
    return event.thredId !== null && event.thredId !== undefined
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

  addThredToParticipants(thredId: string, participants: string[]): Promise<void> {
    return this.thredsStore.addThredToParticipantsStore(thredId, participants);
  }

  /*
      Process a 'bound' event (meaning the event has a thredId)
  */
  // top-level lock here - 'withThredStore' will lock on a per-thredId basis
  // locks are not reentrant so care should be taken not attempt to acquire a lock inside this operation
  private async handleBound(thredId: string, event: Event): Promise<void> {
    const timestamp = Date.now();
    await this.persistEvent(event, thredId);
    const { thredStatus, patternId } = await this.thredsStore.withThredStore(thredId, async (thredStore?: ThredStore) =>
      this.lock_processBoundEvent(event, thredStore, timestamp),
    );
    await this.decrementIfTerminated(thredStatus, patternId);
  }

  /*
      Process an 'unbound' event (meaning the event does not have a thredId)
      An unbound event can match a pattern to start a new thred or a running thred
      if the pattern has the allowUnbound flag set
  */
  private async handleUnbound(event: Event): Promise<void> {
    let matches = 0;
    matches += await this.matchPatterns(event);

    // @TODO re-enable matching against running threds allowing unbound events
    // consider keeping a list of threds allowing unbound events to avoid scanning all threds
    // also consider allowing event.thredId to specify a wildcard or list of thredIds to match against
    //matches += await this.matchRunningThreds(event);

    if (matches === 0) {
      await this.handleOrphanEvent(event);
    }
  }

  /*
      Try matching the event against all patterns to start new threds
  */
  private async matchPatterns(event: Event): Promise<number> {
    const { patterns } = this.thredsStore.patternsStore;
    let matches = 0;
    let errors: EventThrowable[] = [];
    await Series.forEach<Pattern>(patterns, async (pattern) => {
      try {
        if (await this.tryPatternMatch(pattern, event)) matches++;
      } catch (e) {
        errors.push(this.getPatternMatchError(pattern, event, e));
      }
    });
    this.throwIfAnyErrors(`Multiple errors applying patterns to event ${event.id} of type ${event.type}`, errors);
    return matches;
  }

  /*
      Try matching the event against running threds that allow unbound events
  */
  private async matchRunningThreds(event: Event): Promise<number> {
    let matches = 0;
    let errors: EventThrowable[] = [];
    await Series.forEach<string>(await this.thredsStore.getAllThredIds(), async (thredId) => {
      try {
        const result = await this.thredsStore.withThredStore(thredId, async (thredStore?: ThredStore) => {
          if (thredStore && thredStore.pattern.allowUnbound) {
            if (await Thred.test(event, thredStore)) {
              matches++;
              return this.lock_processBoundEvent(event, thredStore, Date.now());
            }
          }
        });
        const { thredStatus, patternId } = result || {};
        if (thredStatus && patternId) await this.decrementIfTerminated(thredStatus, patternId);
      } catch (e) {
        errors.push(this.getUnboundMatchError(thredId, event, e));
      }
    });
    this.throwIfAnyErrors(
      `Multiple errors matching unbound event ${event.id} of type ${event.type} to running threds`,
      errors,
    );
    return matches;
  }

  // creates a top-level lock on patternsStore
  private async tryPatternMatch(pattern: Pattern, event: Event): Promise<boolean> {
    if (!(await pattern.consider(event, new ThredContext()))) {
      return false;
    }
    L.info({
      message: L.h2(`Pattern ${pattern.id} matched event ${event.id} of type ${event.type} - starting Thred`),
      thredId: event.thredId,
    });
    // Note: this is a thred lock (startThred) within a pattern lock (withLockForNewThread)
    // locks are not reentrant so care should be taken not attempt to acquire a lock inside this operation
    const thredStatus = await this.thredsStore.patternsStore.withLockForNewThread(pattern.id, async () =>
      this.lock_startThred(pattern, event),
    );
    await this.decrementIfTerminated(thredStatus, pattern.id);
    return true;
  }

  // requires lock on thredStore
  private async lock_processBoundEvent(
    event: Event,
    thredStore: ThredStore | undefined,
    timestamp: number,
  ): Promise<{ thredStatus: ThredStatus; patternId: string }> {
    if (!thredStore) throw await this.getMissingThredError(event.thredId!, event.id, event.type, timestamp);
    // check to see if this an error event sent by an agent
    this.checkForErrorEvent(event, thredStore);
    await Thred.consider(event, thredStore, this);
    return { thredStatus: thredStore.status, patternId: thredStore.pattern.id };
  }

  // requires lock on patternsStore
  // also create a top-level lock here on thredStore - 'withNewThredStore' will lock on a per-thredId basis
  // locks are not reentrant so care should be taken not attempt to acquire a lock inside this operation
  private async lock_startThred(pattern: Pattern, event: Event): Promise<ThredStatus> {
    return this.thredsStore.withNewThredStore(pattern, async (thredStore: ThredStore) => {
      const boundEvent = { ...event, thredId: thredStore.id };
      await this.persistEvent(boundEvent);
      await Thred.consider(boundEvent, thredStore, this);
      return thredStore.status;
    });
  }

  // check to see if this an error event sent by an agent
  private checkForErrorEvent(event: Event, thredStore: ThredStore): void {
    const error = Events.getError(event);
    if (error) {
      // @TODO once agent config is available - verify event is allowed (i.e. from one of the agents)
      // report the error event to the $thred
      throw ThredThrowable.get(error, 'thred', thredStore.thredContext);
    }
  }

  private async persistEvent(event: Event, thredId?: string): Promise<void> {
    const timestamp = Date.now();
    await Sc.get().replaceEvent({
      event: thredId ? { ...event, thredId } : { ...event },
      timestamp,
    });
  }

  private async decrementIfTerminated(thredStatus: ThredStatus, patternId: string): Promise<void> {
    if (thredStatus === ThredStatus.TERMINATED) {
      await this.thredsStore.patternsStore.decrementPatternInstanceCount(patternId);
    }
  }

  private async getMissingThredError(
    thredId: string,
    eventId: string,
    eventType: string,
    timestamp: number,
  ): Promise<EventThrowable> {
    await Sc.get().saveThredLogRecord({
      thredId,
      eventId,
      type: ThredLogRecordType.NO_THRED,
      timestamp,
    });
    return EventThrowable.get({
      message: `Thred ${thredId} does not, or no longer exists for event ${eventId} of type ${eventType}`,
      code: errorCodes[errorKeys.THRED_DOES_NOT_EXIST].code,
    });
  }

  private getUnboundMatchError(thredId: string, event: Event, error: unknown): EventThrowable {
    L.error({
      message: L.crit(
        `Error when matching unbound event to ${thredId} to event ${event.id} of type ${event.type}: ${error}`,
      ),
      thredId: event.thredId,
      err: error as Error,
    });
    return EventThrowable.get({
      message: `Error when matching unbound event to ${thredId} to event ${event.id} of type ${event.type}`,
      code: errorCodes[errorKeys.SERVER_ERROR].code,
      cause: error,
    });
  }

  private getPatternMatchError(pattern: Pattern, event: Event, error: unknown): EventThrowable {
    L.error({
      message: L.crit(`Error applying pattern ${pattern.id} to event ${event.id} of type ${event.type}: ${error}`),
      thredId: event.thredId,
      err: error as Error,
    });
    return EventThrowable.get({
      message: `Error applying pattern ${pattern.id} to event ${event.id} of type ${event.type}`,
      code: errorCodes[errorKeys.SERVER_ERROR].code,
      cause: error,
    });
  }

  private async handleOrphanEvent(event: Event): Promise<void> {
    const timestamp = Date.now();
    await this.persistEvent(event);
    Sc.get().saveThredLogRecord({
      eventId: event.id,
      type: ThredLogRecordType.NO_PATTERN_MATCH,
      timestamp,
    });
    L.info({
      message: L.h2(`Unbound event ${event.id} of type ${event.type} matched no patterns`),
      thredId: event.thredId,
    });
  }

  private throwIfAnyErrors(message: string, errors: EventThrowable[]): void {
    if (errors.length === 1) {
      throw errors[0];
    } else if (errors.length > 1) {
      throw EventThrowable.get({
        message,
        code: errorCodes[errorKeys.SERVER_ERROR].code,
        cause: errors,
      });
    }
  }
}
