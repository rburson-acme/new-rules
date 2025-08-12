import { ThredThrowable } from '../engine/ThredThrowable';
import { errorCodes, errorKeys, Logger } from '../thredlib/index.js';
import { DurableIntervalTimer } from '../thredlib/lib/DurableIntervalTimer';

/**
 * Singleton class managing participant subscriptions with automatic timestamping and timeout support.
 *
 * Maintains dual indexes for efficient querying by participant or subscription type.
 * Subscriptions are removed by type only, not individually.
 *
 * **Automatic Timeout Management:**
 * - Uses DurableIntervalTimer for periodic cleanup of expired subscriptions
 * - Runs cleanup every SUBSCRIPTION_CLEANUP_INTERVAL (60 seconds)
 * - Removes subscriptions older than MAX_SUBSCRIPTION_AGE (60 seconds)
 * - Timer starts automatically on singleton initialization
 * - Timer can be manually stopped via stopSubscriptionChecks()
 *
 * @example
 * ```typescript
 * const subs = ParticipantSubscriptions.getInstance();
 * subs.addSubscription({ participantId: 'user1', type: ParticipantSubscriptionType.THREDS });
 * const userSubs = subs.getSubscriptionsForParticipant('user1');
 * subs.renewSubscription('user1', ParticipantSubscriptionType.THREDS);
 * subs.removeSubscriptionsOfType('user1', ParticipantSubscriptionType.THREDS);
 * // Stop automatic cleanup if needed
 * subs.stopSubscriptionChecks();
 * ```
 */

const MAX_SUBSCRIPTION_AGE = 60000; // 1 minute
const SUBSCRIPTION_CLEANUP_INTERVAL = 60000; // 1 minute
export interface ParticipantSubscription {
  timestamp?: number;
  participantId: string;
  type: ParticipantSubscriptionType;
  re?: string;
}

export enum ParticipantSubscriptionType {
  THREDS = 'threds',
}

export class ParticipantSubscriptions {
  private static instance: ParticipantSubscriptions;

  /**
   * DurableIntervalTimer instance for automatic subscription timeout cleanup.
   * Configured to run every SUBSCRIPTION_CLEANUP_INTERVAL and remove subscriptions
   * older than MAX_SUBSCRIPTION_AGE.
   */
  private timeoutTimer = new DurableIntervalTimer();

  private constructor() {
    // Start automatic timeout cleanup on initialization
    this.timeoutTimer.start(SUBSCRIPTION_CLEANUP_INTERVAL, () => this.checkSubscriptionTimeouts(MAX_SUBSCRIPTION_AGE));
  }

  static getInstance(): ParticipantSubscriptions {
    if (!ParticipantSubscriptions.instance) {
      ParticipantSubscriptions.instance = new ParticipantSubscriptions();
    }
    return ParticipantSubscriptions.instance;
  }

  private subscriptionsByParticipant: Map<string, Set<ParticipantSubscription>> = new Map();
  private subscriptionsByType: Map<ParticipantSubscriptionType, Set<ParticipantSubscription>> = new Map();

  addSubscription(subscription: ParticipantSubscription): void {
    // Add to participant-based collection
    if (!this.subscriptionsByParticipant.has(subscription.participantId)) {
      this.subscriptionsByParticipant.set(subscription.participantId, new Set());
    }
    // prevent duplicate subscriptions
    if (!this.hasSubscription(subscription.participantId, subscription.type)) {
      subscription.timestamp = Date.now(); // Set timestamp when adding a new subscription
      this.subscriptionsByParticipant.get(subscription.participantId)!.add(subscription);
      // Add to type-based collection
      if (!this.subscriptionsByType.has(subscription.type)) {
        this.subscriptionsByType.set(subscription.type, new Set());
      }
      this.subscriptionsByType.get(subscription.type)!.add(subscription);
    }
  }

  hasSubscription(participantId: string, type: ParticipantSubscriptionType): boolean {
    const participantSubs = this.subscriptionsByParticipant.get(participantId);
    if (!participantSubs) return false;
    for (const sub of participantSubs) {
      if (sub.type === type) return true;
    }
    return false;
  }

  renewSubscription(participantId: string, type: ParticipantSubscriptionType): void {
    const participantSubs = this.subscriptionsByParticipant.get(participantId);
    if (!participantSubs)
      throw ThredThrowable.get({
        code: errorCodes[errorKeys.OBJECT_NOT_FOUND].code,
        message: `Participant ${participantId} not found for subscription renewal`,
      });
    for (const subscription of participantSubs) {
      if (subscription.type === type) {
        subscription.timestamp = Date.now();
        return;
      } else {
        throw ThredThrowable.get({
          code: errorCodes[errorKeys.OBJECT_NOT_FOUND].code,
          message: `Subscription type ${type} not found for participant ${participantId}`,
        });
      }
    }
  }

  getSubscriptionsForParticipant(participantId: string): ParticipantSubscription[] | undefined {
    const subscriptionSet = this.subscriptionsByParticipant.get(participantId);
    return subscriptionSet ? Array.from(subscriptionSet) : undefined;
  }

  getSubscriptionsForType(type: ParticipantSubscriptionType): ParticipantSubscription[] {
    const subscriptionSet = this.subscriptionsByType.get(type);
    return subscriptionSet ? Array.from(subscriptionSet) : [];
  }

  removeSubscriptionsOfType(participantId: string, type: ParticipantSubscriptionType): void {
    const participantSubs = this.subscriptionsByParticipant.get(participantId);
    if (!participantSubs) return;

    const subsToRemove: ParticipantSubscription[] = [];

    // Collect subscriptions to remove without array conversion
    for (const sub of participantSubs) {
      if (sub.type === type) {
        subsToRemove.push(sub);
      }
    }

    if (subsToRemove.length === 0) return;

    // Remove subscriptions from both collections
    for (const sub of subsToRemove) {
      participantSubs.delete(sub);

      const typeSubs = this.subscriptionsByType.get(sub.type);
      if (typeSubs) {
        typeSubs.delete(sub);
        if (typeSubs.size === 0) {
          this.subscriptionsByType.delete(sub.type);
        }
      }
    }

    // Clean up empty participant collection
    if (participantSubs.size === 0) {
      this.subscriptionsByParticipant.delete(participantId);
    }
  }

  /**
   * Stops the automatic subscription timeout cleanup timer.
   * Once stopped, expired subscriptions will no longer be automatically removed.
   * Useful for shutdown scenarios or when manual cleanup control is needed.
   *
   * @public
   */
  stopSubscriptionChecks(): void {
    this.timeoutTimer.stop();
  }

  /**
   * Internal method called by timeoutTimer to clean up expired subscriptions.
   * Identifies and removes subscriptions older than the specified threshold.
   *
   * @param olderThan - Age threshold in milliseconds for subscription removal
   * @private
   */
  private checkSubscriptionTimeouts(olderThan: number): void {
    const cutoffTime = Date.now() - olderThan;
    const timeoutSubscriptions: Array<{ participantId: string; type: ParticipantSubscriptionType }> = [];
    for (const [participantId, subscriptions] of this.subscriptionsByParticipant) {
      for (const subscription of subscriptions) {
        if (subscription.timestamp && subscription.timestamp < cutoffTime) {
          timeoutSubscriptions.push({ participantId, type: subscription.type });
        }
      }
    }
    for (const { participantId, type } of timeoutSubscriptions) {
      Logger.debug(`Removing expired subscription for participant ${participantId} of type ${type}`);
      // Remove expired subscriptions
      this.removeSubscriptionsOfType(participantId, type);
    }
  }
}
