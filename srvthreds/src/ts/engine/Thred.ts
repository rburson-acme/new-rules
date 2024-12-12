import { Event } from '../thredlib/index.js';

import { ThredStore } from './store/ThredStore.js';
import { ReactionResult } from './Reaction.js';
import { Threds } from './Threds.js';
import { Transition } from './Transition.js';

export class Thred {
  /*
      consider should be the only external way to induce a state change (i.e. all calls go through here)
      Note this method should remain synchronous. Any specified consective reactions (via transition forward/local) will run and complete
      before returning.  The caller may rely on that.
    */
  static async consider(event: Event, thredStore: ThredStore, threds: Threds): Promise<void> {
    const { thredContext } = thredStore;
    let inputEvent: Event | undefined = event;

    // synchronize thred state - chance to run handlers to fix up state (expirations, etc)
    // note, this can advance the state to a new reaction
    await Thred.synchronizeThredState(thredStore, threds);

    // system event hook
    /*
    if (SystemThredEvent.isSystemThredEvent(event))
      return SystemThredEvent.handleSystemThredEvent({
        event,
        thredStore,
        threds,
        thredCompanion: Thred.createCompanion(),
      });
      */

    // loop wil continue as long as there is a currentReaction and an inputEvent
    transitionLoop: do {
      // apply the event to the current state. There will be a result if the event triggers a state change
      const reactionResult: ReactionResult | undefined = await thredStore.currentReaction?.apply(
        inputEvent,
        thredStore,
      );
      //if there's not a match, end the loop
      if (!reactionResult) break transitionLoop;
      // attempt state change and retrieve next input
      inputEvent = await Thred.nextReaction(thredStore, reactionResult?.transition, inputEvent);
      // send any message - NOTE: don't wait for dispatch
      reactionResult?.message && threds.dispatch(reactionResult?.message);
    } while (inputEvent);
  }

  // state transition + apply next input
  static async transition(thredStore: ThredStore, threds: Threds, transition?: Transition): Promise<void> {
    const inputEvent = await Thred.nextReaction(thredStore, transition);
    if (inputEvent) await Thred.consider(inputEvent, thredStore, threds);
  }

  static async terminateThred(thredStore: ThredStore): Promise<void> {
    thredStore.finish();
  }

  // time out the current reaction and move to the reaction 
  // specified by the transition (or the default if transition is undefined)
  // Note the Reaction must have an expiry property set
  static async expireReaction(thredStore: ThredStore, threds: Threds): Promise<void> {
    const expiry = thredStore?.currentReaction?.expiry;
    if (expiry) {
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

  // give private Thred access to helpers
  private static createCompanion(): ThredCompanion {
    return {
      expireReaction: Thred.expireReaction,
      transition: Thred.transition,
      terminateThred: Thred.terminateThred,
    };
  }
}

export interface ThredCompanion {
  expireReaction(thredStore: ThredStore, threds: Threds): Promise<void>;
  transition(thredStore: ThredStore, threds: Threds, transition: Transition): Promise<void>;
  terminateThred(thredStore: ThredStore): Promise<void>;
}
