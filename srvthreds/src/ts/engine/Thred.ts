import { Event, Logger as L, ThredLogRecordType, addressToArray } from '../thredlib/index.js';

import { ThredStore } from './store/ThredStore.js';
import { ReactionResult } from './Reaction.js';
import { Threds } from './Threds.js';
import { Transition } from './Transition.js';
import { SystemController as Pm } from '../persistence/controllers/SystemController.js';
import { System } from './System.js';
import { MessageTemplate } from './MessageTemplate.js';
import { BuiltInReaction } from './builtins/BuiltInReaction.js';
import { Effects } from './effects/Effects.js';

/**
 * The Thred class is responsible for processing an Event through a series of state transitions (reactions).
 * A Thred is a state machine that can be in one of many states (reactions) and can transition to other states based on input events.
 */
export class Thred {
  /**
   * 'consider' is the only external way to induce a state change (i.e. all calls go through here)
   * The consider method should be synchonized so that only one event for a particular thredId is processed at a time. i.e. lock on thredId
   * This is currently handled by the Threds class using the withThredStore methods
   * Note this method should remain synchronous. Any specified consective reactions (via transition forward/local) will run and complete
   * before returning.  The caller may rely on that.
   */
  static async consider(event: Event, thredStore: ThredStore, threds: Threds): Promise<void> {
    let inputEvent: Event | undefined = event;

    // synchronize thred state - chance to run handlers to fix up state (expirations, etc)
    // note, this can advance the state to a new reaction
    await Thred.synchronizeThredState(thredStore, threds);

    const fromReactionName = thredStore.currentReaction?.name;

    // loop wil continue as long as there is a currentReaction and an inputEvent
    transitionLoop: do {
      const reactionResult = await this.applyReaction(inputEvent, thredStore);

      // if there's not a match, end the loop
      if (!reactionResult) {
        await this.logTransitionResult(thredStore, event, fromReactionName, undefined, false);
        break transitionLoop;
      }

      // run any effects, attempt state change and retrieve next input
      inputEvent = await this.processTransition(thredStore, reactionResult, inputEvent, threds);

      await this.logTransitionResult(thredStore, event, fromReactionName, thredStore.currentReaction?.name, true);

      // resolve and store the participant addresses, then dispatch the message
      await this.dispatchMessage(reactionResult.messageTemplate, event.source.id, thredStore, threds);
    } while (inputEvent);
  }

  static async test(event: Event, thredStore: ThredStore): Promise<boolean> {
    return thredStore.currentReaction?.test(event, thredStore.thredContext) || false;
  }

  private static async synchronizeThredState(thredStore: ThredStore, threds: Threds) {
    // check for an expired reaction
    if (thredStore.reactionTimedOut) await Thred.expireReaction(thredStore, threds);
  }

  // apply the event to the current state (or a builtin reaction). There will be a result if the event triggers a state change
  private static async applyReaction(inputEvent: Event, thredStore: ThredStore): Promise<ReactionResult | undefined> {
    return BuiltInReaction.isBuiltInOp(inputEvent)
      ? await BuiltInReaction.apply(inputEvent, thredStore)
      : await thredStore.currentReaction?.apply(inputEvent, thredStore);
  }

  // run any effects, attempt state change and retrieve next input
  private static async processTransition(
    thredStore: ThredStore,
    reactionResult: ReactionResult,
    inputEvent: Event,
    threds: Threds,
  ): Promise<Event | undefined> {
    await Effects.run(inputEvent, thredStore, threds);
    return await Thred.nextReaction(thredStore, reactionResult.transition, inputEvent);
  }

  // state transition - shift state to new reaction, if any and return the next input, if any
  private static async nextReaction(
    thredStore: ThredStore,
    transition?: Transition,
    currentEvent?: Event,
  ): Promise<Event | undefined> {
    const { id, pattern, thredContext } = thredStore;
    // get the next reaction (if any)
    thredStore.transitionTo(pattern.nextReaction(thredStore.currentReaction, transition));
    thredStore.updateMeta({
      label: currentEvent?.data?.title || pattern.name,
      description: currentEvent?.data?.description || currentEvent?.type,
      displayUri: currentEvent?.data?.display?.uri,
    });
    // get the next input event if any
    return thredStore.isActive ? transition?.nextInputEvent(thredContext, currentEvent) : undefined;
  }

  // resolve and store the participant addresses, then dispatch the message
  private static async dispatchMessage(
    messageTemplate: MessageTemplate | undefined,
    sourceId: string,
    thredStore: ThredStore,
    threds: Threds,
  ): Promise<void> {
    if (!messageTemplate) return;

    // translate 'directives' in the 'to' field to actual participantIds
    const to = await this.resolveAndUpdateParticipants(
      addressToArray(messageTemplate.to),
      sourceId,
      thredStore,
      threds,
    );
    await threds.handleMessage({ ...messageTemplate, to });
  }
  // resolve the 'to' field in the message template to actual participantIds and store participantIds associations
  static async resolveAndUpdateParticipants(
    addresses: string[],
    sourceId: string,
    thredStore: ThredStore,
    threds: Threds,
  ): Promise<string[]> {
    // translate 'directives' in the 'to' field to actual participantIds
    const to = await System.getSessions().getParticipantIdsFor(addresses, thredStore?.thredContext);
    // update the thredContext with the expanded participants
    thredStore?.addParticipantIds([...to, sourceId]);
    // update the store w/ participant to thred mappings
    await threds.addThredToParticipants(thredStore.id, [...to, sourceId]);
    return to;
  }

  // state transition + apply next input
  static async transition(thredStore: ThredStore, threds: Threds, transition?: Transition): Promise<void> {
    const inputEvent = await Thred.nextReaction(thredStore, transition);
    if (inputEvent) await Thred.consider(inputEvent, thredStore, threds);
  }

  // time out the current reaction and move to the reaction
  // specified by the transition (or the default if transition is undefined)
  // Note the Reaction must have an expiry property set
  static async expireReaction(thredStore: ThredStore, threds: Threds): Promise<void> {
    const { currentReaction } = thredStore;
    if (!currentReaction?.expiry) return;

    L.debug({
      message: L.h2(`Thred:expireReaction Expiring Reaction ${currentReaction.name} for thredId: ${thredStore.id}`),
      thredId: thredStore.id,
    });

    await Thred.transition(thredStore, threds, currentReaction.expiry.transition);
  }

  private static async logNoTransition(thredStore: ThredStore, event: Event, fromReaction?: string) {
    Pm.get().saveThredLogRecord({
      thredId: thredStore.id,
      eventId: event.id,
      type: ThredLogRecordType.NO_MATCH,
      fromReaction,
      timestamp: Date.now(),
    });
  }

  private static async logTransition(thredStore: ThredStore, event: Event, fromReaction?: string, toReaction?: string) {
    await Pm.get().saveThredLogRecord({
      thredId: thredStore.id,
      eventId: event.id,
      type: ThredLogRecordType.MATCH,
      fromReaction,
      toReaction,
      timestamp: Date.now(),
    });
  }

  // log the transition if any - thredStore may be updated with a new reaction
  private static async logTransitionResult(
    thredStore: ThredStore,
    event: Event,
    fromReaction: string | undefined,
    toReaction: string | undefined,
    transitioned: boolean,
  ): Promise<void> {
    if (transitioned) {
      await Thred.logTransition(thredStore, event, fromReaction, toReaction);
      L.debug({
        message: L.h2(
          `Thred ${thredStore.id} event ${event.id} fired transition from ${fromReaction} to ${toReaction}`,
        ),
        thredId: thredStore.id,
      });
    } else {
      await Thred.logNoTransition(thredStore, event, fromReaction);
      L.debug({
        message: L.h2(`Thred ${thredStore.id} event ${event.id} did not fire transition from ${fromReaction}`),
        thredId: thredStore.id,
      });
    }
  }
}
