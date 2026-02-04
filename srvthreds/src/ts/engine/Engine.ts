import { errorCodes, errorKeys, Logger, Parallel, PatternModel } from '../thredlib/index.js';
import { Event } from '../thredlib/index.js';
import { Threds } from './Threds.js';
import { ThredsStore } from './store/ThredsStore.js';
import { PatternsStore } from './store/PatternsStore.js';
import { EventQ } from '../queue/EventQ.js';
import { StorageFactory } from '../storage/StorageFactory.js';
import { QMessage } from '../queue/QService.js';
import { serializableError } from '../thredlib/core/Errors.js';
import { Events } from './Events.js';
import { MessageHandler } from './MessageHandler.js';
import { SystemThreds } from '../admin/SystemThreds.js';
import { PubSubFactory } from '../pubsub/PubSubFactory.js';
import { Topics } from '../pubsub/Topics.js';
import { SystemController as Sc } from '../persistence/controllers/SystemController.js';
import { MessageTemplate } from './MessageTemplate.js';
import { System } from './System.js';
import { ParticipantsStore } from './store/ParticipantsStore.js';
import { ConfigLoader } from '../config/ConfigLoader.js';
import { PromiseTracker } from '../lib/PromiseTracker.js';

const { debug, error, info, crit, h1, h2, logObject } = Logger;

/**
 * The Engine is the main entry point for Event processing.
 * It pulls Events from the inbound queue and dispatches Messages to participants (users and agents).
 */
export class Engine implements MessageHandler {
  dispatchers: ((messageTemplate: MessageTemplate) => Promise<void> | void)[] = [];
  readonly threds: Threds;
  readonly thredsStore: ThredsStore;
  private readonly promiseTracker: PromiseTracker;

  constructor(readonly inboundQ: EventQ) {
    this.promiseTracker = new PromiseTracker({ logPrefix: 'Engine' });
    if (!System.isInitialized())
      throw new Error('System not initialized - call System.initialize() before creating Engine');
    const storage = StorageFactory.getStorage();
    this.thredsStore = new ThredsStore(new PatternsStore(storage), storage, new ParticipantsStore(storage));
    // this can be determined by config so that we can run 'System' nodes seperately
    // this.threds = new Threds(this.thredsStore, this);
    this.threds = new SystemThreds(this.thredsStore, this);
  }

  public async start(configOverrides?: { patternModels?: PatternModel[] }): Promise<void> {
    // load existing patterns from storage
    await this.thredsStore.patternsStore.loadPatterns();
    // add any new patterns from config (runtime)
    if (configOverrides?.patternModels) await this.thredsStore.patternsStore.addPatterns(configOverrides.patternModels);
    await this.threds.initialize();
    // subscribe to pattern changes in storage
    await PubSubFactory.getSub().subscribe([Topics.PatternChanged], async (topic, message) => {
      if (message.all) {
        await ConfigLoader.loadAllActivePatternsFromPersistence(Sc.get(), this.thredsStore.storage);
      } else {
        await this.thredsStore.patternsStore.staleCheck(message.id);
      }
    });
    this.run();
  }

  public async shutdown(delay: number = 0): Promise<void> {
    await this.promiseTracker.startAndDrain(delay || undefined);
  }

  /**
   * These are outbound 'messages', addressed to specific participants(i.e. an event with an address)
   * @param event
   * @param to
   */
  public async handleMessage(messageTemplate: MessageTemplate): Promise<void> {
    try {
      // log the event
      info({
        message: h1(`Engine publish Message:Event ${messageTemplate.event.id} to ${messageTemplate.to}`),
        thredId: messageTemplate.event.thredId,
      });
      debug({ thredId: messageTemplate.event.thredId, obj: messageTemplate });
      // NOTE: dispatch all at once - failure notification will be handled separately
      await Parallel.forEach(this.dispatchers, async (dispatcher) => dispatcher(messageTemplate));
    } catch (e) {
      error({
        message: crit(`Engine::Failed dispatch message : ${messageTemplate}`),
        thredId: messageTemplate.event.thredId,
        err: e as Error,
      });
    }
  }

  /*
        Begin pulling events from the Q
        Configure the prefetch value in the Rascal settings to throttle message delivery
        To process events synchronously add an await before the processEvent call
  */
  private async run() {
    while (!this.promiseTracker.isDraining) {
      const message: QMessage<Event> = await this.inboundQ.pop();
      if (this.promiseTracker.isDraining) {
        await this.inboundQ.requeue(message);
        break;
      }
      this.promiseTracker.track(this.processEvent(message));
    }
  }

  private async processEvent(message: QMessage<Event>): Promise<void> {
    const timestamp = Date.now();
    try {
      // handle the event
      await this.consider(message.payload);
      // remove the message from the queue
      await this.inboundQ.delete(message);
    } catch (e) {
      error({
        message: crit(`Failed to consider event ${message.payload?.id}`),
        thredId: message.payload?.thredId,
        err: e as Error,
      });
      try {
        await this.inboundQ.reject(message, e as Error).catch(error);
        // update the event with the error
        await Sc.get().upsertEventWithError({ event: message.payload, error: e, timestamp });
        await this.handleErrorNotification(e, message.payload);
        // @TODO figure out on what types of Errors it makes sense to requeue
        // await this.inboundQ.requeue(message, e).catch(Logger.error);
      } catch (err) {
        error({
          message: crit(`Failed to handle error in processEvent ${message.payload?.id}`),
          thredId: message.payload?.thredId,
          err: err as Error,
        });
      }
    }
  }

  /*
   * Handle error notification based on error 'scope'
   * The error is either sent to the originating participant or to all participants in the thred if any
   * This method does not sent errors to service addresses
   */
  private async handleErrorNotification(e: any, inboundEvent: Event): Promise<void> {
    try {
      const cause = serializableError(e.eventError ? e.eventError.cause : e);
      // if e is a ThredThrowable, it will have an eventError otherwise create it
      const eventError = e.eventError ? e.eventError : { ...errorCodes[errorKeys.SERVER_ERROR], cause };
      // check the scope to determine who should be notified
      const to: string[] = e.notifyScope === 'thred' && e.thredContext ? ['$thred'] : [inboundEvent.source.id];
      const outboundEvent = Events.newEventFromEvent({
        prevEvent: inboundEvent,
        title: `Failure processing Event ${inboundEvent.id} : ${eventError?.message}`,
        error: eventError,
      });
      // translate 'directives' in the 'to' field to actual participantIds
      const resolvedTo = await System.getSessions().getParticipantIdsFor(to, e.thredContext);
      const { participantAddresses: resolvedToParticipants } = System.getSessions()
        .getAddressResolver()
        .filterServiceAddresses(resolvedTo);
      // only send to participant addresses
      if (resolvedToParticipants.length > 0) {
        // send the error message
        await this.handleMessage({ event: outboundEvent, to: resolvedToParticipants });
      }
    } catch (e) {
      error({
        message: crit(`Engine::Failed handle error for event id: ${inboundEvent.id}`),
        thredId: inboundEvent.thredId,
        err: e as Error,
      });
    }
  }

  /**
   * These are incoming 'events' to be 'consumed' by the Engine
   * i.e. Events not Messages (no addressee)
   * @param event
   */
  consider(event: Event): Promise<void> {
    info({ message: h1(`Engine received Event ${event.id} from ${event.source.id}`), thredId: event.thredId });
    debug({ thredId: event.thredId, obj: event });
    return this.threds.consider(event);
  }

  get numThreds(): Promise<number> {
    return this.thredsStore.numThreds;
  }
}
