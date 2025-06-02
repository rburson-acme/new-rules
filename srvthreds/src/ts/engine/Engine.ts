import { errorCodes, errorKeys, Logger, Parallel, addressToArray } from '../thredlib/index.js';
import { Event } from '../thredlib/index.js';
import { Threds } from './Threds.js';
import { ThredsStore } from './store/ThredsStore.js';
import { PatternsStore } from './store/PatternsStore.js';
import { EventQ } from '../queue/EventQ.js';
import { StorageFactory } from '../storage/StorageFactory.js';
import { RunConfig } from './Config.js';
import { QMessage } from '../queue/QService.js';
import { EventThrowable, serializableError } from '../thredlib/core/Errors.js';
import { Events } from './Events.js';
import { MessageHandler } from './MessageHandler.js';
import { SystemThreds } from '../admin/SystemThreds.js';
import { PubSubFactory } from '../pubsub/PubSubFactory.js';
import { Topics } from '../pubsub/Topics.js';
import { SystemController as Sc } from '../persistence/controllers/SystemController.js';
import { ThredContext } from './ThredContext.js';
import { MessageTemplate } from './MessageTemplate.js';
import { System } from './System.js';
import { ThredStore } from './store/ThredStore.js';
import { ParticipantsStore } from './store/ParticipantsStore.js';

const { debug, error, warn, crit, h1, h2, logObject } = Logger;

/**
 * The Engine is the main entry point for Event processing. 
 * It pulls Events from the inbound queue and dispatches Messages to participants (users and agents).
 */
export class Engine implements MessageHandler {
  dispatchers: ((messageTemplate: MessageTemplate) => Promise<void> | void)[] = [];
  readonly threds: Threds;
  readonly thredsStore: ThredsStore;

  constructor(readonly inboundQ: EventQ) {
    if (!System.isInitialized())
      throw new Error('System not initialized - call System.initialize() before creating Engine');
    const storage = StorageFactory.getStorage();
    this.thredsStore = new ThredsStore(new PatternsStore(storage), storage, new ParticipantsStore(storage));
    // this can be determined by config so that we can run 'System' nodes seperately
    // this.threds = new Threds(this.thredsStore, this);
    this.threds = new SystemThreds(this.thredsStore, this);
  }

  public async start(config?: RunConfig) {
    // load existing patterns from storage
    await this.thredsStore.patternsStore.loadPatterns();
    // add any new patterns from config (runtime)
    if (config?.patternModels) await this.thredsStore.patternsStore.addPatterns(config.patternModels);
    await this.threds.initialize();
    // subscribe to pattern changes in storage
    await PubSubFactory.getPubSub().subscribe([Topics.PatternChanged], async (topic, message) => {
      await this.thredsStore.patternsStore.staleCheck(message.id);
    });
    this.run();
  }

  public async shutdown(delay: number = 0): Promise<void> {
    return System.getPROC().shutdown(delay);
  }

  // @TODO Messages should also be routed to archival service here for failover and latent delivery

  /**
   * These are outbound 'messages', addressed to specific participants(i.e. an event with an address)
   * @param event
   * @param to
   */
  public async handleMessage(messageTemplate: MessageTemplate): Promise<void> {
    const timestamp = Date.now();
    const event = messageTemplate.event;
    try {
      // log the event
      debug(h1(`Engine publish Message:Event ${messageTemplate.event.id} to ${messageTemplate.to}`));
      logObject(messageTemplate);
      await Sc.get().replaceEvent({ event: messageTemplate.event, to: addressToArray(messageTemplate.to), timestamp });
      // NOTE: dispatch all at once - failure notification will be handled separately
      await Parallel.forEach(this.dispatchers, async (dispatcher) => dispatcher(messageTemplate));
    } catch (e) {
      error(crit(`Engine::Failed dispatch message : ${messageTemplate}`), e as Error, (e as Error).stack);
    }
  }

  /*
        Begin pulling events from the Q
        Currently, logic depends on this being on 1 event at a time
        This could, in the future, be changed to 1 event per Thred at a time
    */
  private async run() {
    while (true) {
      const message: QMessage<Event> = await this.inboundQ.pop();
      const timestamp = Date.now();
      try {
        // persist the event before consideration
        await Sc.get().replaceEvent({ event: message.payload, timestamp });
        // handle the event
        await this.consider(message.payload);
        // remove the message from the queue
        await this.inboundQ.delete(message);
      } catch (e) {
        error(crit(`Failed to consider event ${message.payload?.id}`), e as Error, (e as Error).stack);
        await this.inboundQ.reject(message, e as Error).catch(error);
        // update the event with the error
        await Sc.get().replaceEvent({ event: message.payload, error: e, timestamp });
        await this.handleError(e, message.payload);
        // @TODO figure out on what types of Errors it makes sense to requeue
        // await this.inboundQ.requeue(message, e).catch(Logger.error);
      }
    }
  }

  /*
    Respond to the source of the event with an error event
  */
  private async handleError(e: any, inboundEvent: Event): Promise<void> {
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
      // send the error message
      await this.handleMessage({ event: outboundEvent, to: resolvedTo });
    } catch (e) {
      error(crit(`Engine::Failed handle error for event id: ${inboundEvent.id}`), e as Error, (e as Error).stack);
    }
  }

  /**
   * These are incoming 'events' to be 'consumed' by the Engine
   * i.e. Events not Messages (no addressee)
   * @param event
   */
  consider(event: Event): Promise<void> {
    debug(h1(`Engine received Event ${event.id} from ${event.source.id}`));
    logObject(event);
    return this.threds.consider(event);
  }

  get numThreds(): Promise<number> {
    return this.thredsStore.numThreds;
  }
}
