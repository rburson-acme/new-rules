import { Event, Logger as L } from '../thredlib/index.js';

import { ThredStore } from './store/ThredStore.js';
import { ReactionResult } from './Reaction.js';
import { Threds } from './Threds.js';
import { Transition } from './Transition.js';
import { PersistenceManager as Pm } from './persistence/PersistenceManager.js';
import { MATCH, NO_MATCH } from '../thredlib/persistence/ThredLogRecord.js';

export class Thred {
  /*
      'consider' should be the only external way to induce a state change (i.e. all calls go through here)
      Note this method should remain synchronous. Any specified consective reactions (via transition forward/local) will run and complete
      before returning.  The caller may rely on that.
    */
  static async consider(event: Event, thredStore: ThredStore, threds: Threds): Promise<void> {
    let inputEvent: Event | undefined = event;

    // synchronize thred state - chance to run handlers to fix up state (expirations, etc)
    // note, this can advance the state to a new reaction
    await Thred.synchronizeThredState(thredStore, threds);

    const fromReactionName = thredStore.currentReaction?.name;
    // loop wil continue as long as there is a currentReaction and an inputEvent
    transitionLoop: do {
      // apply the event to the current state. There will be a result if the event triggers a state change
      const reactionResult: ReactionResult | undefined = await thredStore.currentReaction?.apply(inputEvent, thredStore);
      //if there's not a match, end the loop
      if (!reactionResult) {
        await Thred.logNoTransition(thredStore, event, fromReactionName);
        L.debug(L.h2(`Thred ${thredStore.id} event ${event.id} did not fire transition from ${fromReactionName}`));
        break transitionLoop;
      }
      // add the source of the event to the participants list
      thredStore.thredContext.addParticipantIds(inputEvent.source.id);
      // attempt state change and retrieve next input
      inputEvent = await Thred.nextReaction(thredStore, reactionResult.transition, inputEvent);

      // note thredStore may be updated with a new reaction
      await Thred.logTransition(thredStore, event, fromReactionName, thredStore.currentReaction?.name);
      L.debug(L.h2(`Thred ${thredStore.id} event ${event.id} fired transition from ${fromReactionName} to ${thredStore.currentReaction?.name}`));

      reactionResult?.messageTemplate && await threds.handleMessage(reactionResult.messageTemplate, thredStore.thredContext);
    } while (inputEvent);
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
    const expiry = thredStore?.currentReaction?.expiry;
    if (expiry) {
      L.debug(
        L.h2(`Thred:expireReaction Expiring Reaction ${thredStore.currentReaction.name} for thredId: ${thredStore.id}`),
      );
      const transtition = thredStore?.currentReaction?.expiry?.transition;
      await Thred.transition(thredStore, threds, transtition);
    }
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
    // get the next input event if any
    return !thredStore.isFinished ? transition?.nextInputEvent(thredContext, currentEvent) : undefined;
  }

  private static async synchronizeThredState(thredStore: ThredStore, threds: Threds) {
    // check for an expired reaction
    if (thredStore.reactionTimedOut) await Thred.expireReaction(thredStore, threds);
  }

  private static async logNoTransition(thredStore: ThredStore, event: Event, fromReaction?: string) {
    Pm.get().saveThredLogRecord({
      thredId: thredStore.id,
      eventId: event.id,
      type: NO_MATCH,
      fromReaction,
      timestamp: Date.now(),
    });
  }

  private static async logTransition(thredStore: ThredStore, event: Event, fromReaction?: string, toReaction?: string) {
    await Pm.get().saveThredLogRecord({
      thredId: thredStore.id,
      eventId: event.id,
      type: MATCH,
      fromReaction,
      toReaction,
      timestamp: Date.now(),
    });
  }
}