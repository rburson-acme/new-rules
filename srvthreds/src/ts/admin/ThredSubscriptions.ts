import { KeySubscriberFactory } from '../pubsub/KeySubscriberFactory';
import { PubSubFactory } from '../pubsub/PubSubFactory';
import { Topics } from '../pubsub/Topics';
import { Logger } from '../thredlib';
import { debounce } from '../thredlib/lib/debounce';

/*
 * ThredSubscriptions is a singleton class that manages subscriptions to thread changes.
 */
export class ThredSubscriptions {
  // lower debounce times here may cause unexpected behavior when threds are transitioned quickly
  private static SUB_DEBOUCE_TIME = 1000; // milliseconds
  /*
   Note see the Redis keyspace start up configuration.  It is currently set to report key events for all ops (KA).
   This could be tuned to be more specific to improve performance. for example: KGh would only report hset and delete
  */
  private static readonly THRED_PATTERN = '__keyspace@0__:Thred:*';
  private static instance: ThredSubscriptions;
  private keySubscriber = KeySubscriberFactory.getKeySubscriber();
  private subscriptions: Map<string, (thredId: string, eventType: string) => void> = new Map();

  private constructor() {}

  public static getInstance(): ThredSubscriptions {
    if (!ThredSubscriptions.instance) {
      ThredSubscriptions.instance = new ThredSubscriptions();
    }
    return ThredSubscriptions.instance;
  }

  /*
   * Subscribe to thread changes
   * @param handle - a unique identifier for the subscription, used to unsubscribe later
   * @param notifyFn - a function that will be called with the thredId and eventType when a change occurs
   * @returns void
   */
  async subscribeToThredChanges(handle: string, notifyFn: (thredId: string, eventType: string) => void) {
    if (this.subscriptions.size === 0) {
      this.keySubscriber.subscribe([ThredSubscriptions.THRED_PATTERN], async (pattern, channel, eventType) => {
        const thredId = channel.split(':')[2];
        Logger.debug('got notification for thred change', thredId, eventType);
        this.subscriptions.forEach((value, key) => value(thredId, eventType));
      });
    }
    this.subscriptions.set(
      handle,
      // debounce with trailing edge to avoid multiple calls in quick succession
      debounce(notifyFn, ThredSubscriptions.SUB_DEBOUCE_TIME),
    );
  }

  hasAnySubscriptions(): boolean {
    return this.subscriptions.size > 0;
  }

  hasSubscription(handle: string): boolean {
    return this.subscriptions.has(handle);
  }

  /*
   * Unsubscribe from thread changes
   * @param handle - the unique identifier for the subscription to unsubscribe
   * @returns void
   */
  async unsubscribeFromThredChanges(handle: string) {
    this.subscriptions.delete(handle);
    if (this.subscriptions.size === 0) {
      await this.keySubscriber.unsubscribe([ThredSubscriptions.THRED_PATTERN]);
    }
  }
}
