import { DurableTimer } from '../thredlib/index.js';
import { Reaction } from './Reaction.js';
import { Transition } from './Transition.js';
import { Threds } from './Threds.js';
import { ThredStore } from './store/ThredStore.js';

export class ThredMonitor {
  private reactionTimer: DurableTimer = new DurableTimer();

  updateReactionExpiry(
    thredStore: ThredStore,
    threds: Threds,
    reaction: Reaction | undefined,
    performTransition: (thredStore: ThredStore, threds: Threds, transition?: Transition) => void,
  ) {
    this.reactionTimer.stop();
    if (reaction?.expiry?.interval) {
      const {
        expiry: { interval, transition },
      } = reaction;
      this.reactionTimer.start(interval, () => {
        performTransition(thredStore, threds, transition);
      });
    }
  }

  stop() {
    this.reactionTimer.stop();
  }
}
