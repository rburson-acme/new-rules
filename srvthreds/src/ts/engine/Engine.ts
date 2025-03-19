import { errorCodes, errorKeys, Logger, Parallel } from '../thredlib/index.js';
import { Event } from '../thredlib/index.js';
import { Message } from '../thredlib/index.js';
import { Threds } from './Threds.js';
import { ThredsStore } from './store/ThredsStore.js';
import { EventsStore } from './store/EventsStore.js';
import { PatternsStore } from './store/PatternsStore.js';
import { EventQ } from '../queue/EventQ.js';
import { StorageFactory } from '../storage/StorageFactory.js';
import { RunConfig } from './Config.js';
import { QMessage } from '../queue/QService.js';
import { EventThrowable } from '../thredlib/core/Errors.js';
import { Events } from './Events.js';
import { Dispatcher } from './Dispatcher.js';
import { AdminThreds } from '../admin/AdminThreds.js';
import { PubSubFactory } from '../pubsub/PubSubFactory.js';
import { Topics } from '../pubsub/Topics.js';
import { PersistenceManager as Pm } from './persistence/PersistenceManager.js';
import { ThredContext } from './ThredContext.js';
import { ReactionResult } from './Reaction.js';
import { MessageTemplate } from './MessageTemplate.js';
import { System } from './System.js';

const { debug, error, warn, crit, h1, h2, logObject } = Logger;

export class Engine implements Dispatcher {
  dispatchers: (
    | ((message: MessageTemplate, thredContext?: ThredContext) => Promise<void>)
    | ((messageTemplate: MessageTemplate, thredContext?: ThredContext) => void)
  )[] = [];
  readonly threds: Threds;
  readonly thredsStore: ThredsStore;

  constructor(
    readonly inboundQ: EventQ,
  ) {
    if(!System.isInitialized()) throw new Error('System not initialized - call System.initialize() before creating Engine');
    const storage = StorageFactory.getStorage();
    this.thredsStore = new ThredsStore(new PatternsStore(storage), storage);
    // this can be determined by config so that we can run 'Admin' nodes seperately
    // this.threds = new Threds(this.thredsStore, this);
    this.threds = new AdminThreds(this.thredsStore, this);
  }

  public async start(config?: RunConfig) {
    // add and store patterns then load existing patterns from storage
    await this.thredsStore.patternsStore.loadPatterns();
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
   * These are outbound 'messages', addressed to specific participants
   * 'React Systems' metaphor - message with address. (ie. tell)
   * @param event
   * @param to
   */
  public async dispatch(messageTemplate: MessageTemplate, thredContext?: ThredContext): Promise<void> {
    const timestamp = Date.now();
    try {
      debug(h1(`Engine publish Message:Event ${messageTemplate.event.id} to ${messageTemplate.to}`));
      logObject(messageTemplate);
      await Pm.get().saveEvent({ event: messageTemplate.event, to: messageTemplate.to, timestamp });
      // NOTE: dispatch all at once - failure notification will be handled separately
      await Parallel.forEach(this.dispatchers, async (dispatcher) => dispatcher(messageTemplate, thredContext));
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
        await this.consider(message.payload);
        await this.inboundQ.delete(message);
        await Pm.get().saveEvent({ event: message.payload, timestamp });
      } catch (e) {
        error(crit(`Failed to consider event ${message.payload?.id}`), e as Error, (e as Error).stack);
        await this.inboundQ.reject(message, e as Error).catch(error);
        await Pm.get().saveEvent({ event: message.payload, error: e, timestamp });
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
      const eventError =
        e instanceof EventThrowable ? e.eventError : { ...errorCodes[errorKeys.SERVER_ERROR], cause: e };
      const outboundEvent = Events.newEventFromEvent({
        prevEvent: inboundEvent,
        title: `Failure processing Event ${inboundEvent.id} : ${eventError?.message}`,
        error: eventError,
      });
      await this.dispatch({ event: outboundEvent, to: [inboundEvent.source.id] });
    } catch (e) {
      error(crit(`Engine::Failed handle error for event id: ${inboundEvent.id}`), e as Error, (e as Error).stack);
    }
  }

  /**
   * These are incoming 'events' to 'consumed' by any interested parties
   * 'Reactive Programming' metaphor - no 'addressee'. (ie. publish)
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
