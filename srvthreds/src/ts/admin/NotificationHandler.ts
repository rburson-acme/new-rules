import { Threds } from '../engine/Threds.js';
import { Events } from '../engine/Events.js';
import { ParticipantSubscriptions, ParticipantSubscriptionType } from '../sessions/ParticipantSubscriptions.js';
import { ThredSubscriptions } from './ThredSubscriptions.js';
import { eventTypes, Parallel, ThredId } from '../thredlib/index.js';

/**
 * NotificationHandler is a singleton class that manages notifications for thred changes.
 * It coordinates between participant subscriptions and thred subscriptions.
 */
export class NotificationHandler {
  private static instance: NotificationHandler;

  /**
   * Private constructor to enforce singleton pattern
   * @param threds - The Thred instance to be used for notifications
   */
  private constructor(private threds: Threds) {}

  /**
   * Get the singleton instance of NotificationHandler
   * @param threds - The Thred instance (only used when creating the instance for the first time)
   * @returns The singleton instance of NotificationHandler
   */
  public static getInstance(threds?: Threds): NotificationHandler {
    if (!NotificationHandler.instance) {
      if (!threds) {
        throw new Error('Threds instance must be provided when creating NotificationHandler for the first time');
      }
      NotificationHandler.instance = new NotificationHandler(threds);
    }
    return NotificationHandler.instance;
  }

  /**
   * Register a participant for thred change notifications
   * @param participantId - The ID of the participant to register
   */
  public registerForNotification(participantId: string, re?: string): void {
    // Lazily subscribe to notifications for thred changes
    if (!ThredSubscriptions.getInstance().hasSubscription('notificationHandler')) {
      this.setupNotifications();
    }
    // Add subscription for the participant
    ParticipantSubscriptions.getInstance().addSubscription({
      participantId,
      type: ParticipantSubscriptionType.THREDS,
      re,
    });
  }

  /**
   * Renew the registration for a participant
   * @param participantId - The ID of the participant to renew registration for
   */
  public renewRegistration(participantId: string): void {
    ParticipantSubscriptions.getInstance().renewSubscription(participantId, ParticipantSubscriptionType.THREDS);
  }

  /**
   * Unregister a participant from thred change notifications
   * @param participantId - The ID of the participant to unregister
   */
  public unregisterForNotification(participantId: string): void {
    ParticipantSubscriptions.getInstance().removeSubscriptionsOfType(participantId, ParticipantSubscriptionType.THREDS);
  }

  private setupNotifications(): void {
    // Subscribe to thred changes with the participant as the handle
    ThredSubscriptions.getInstance().subscribeToThredChanges(
      'notificationHandler',
      async (thredId: string, eventType: string) => {
        const thredStore = await this.threds.thredsStore.getThredStoreReadOnly(thredId);
        const thredJson = thredStore.toJSON();
        // notify all participants subscribed to thred changes asynchronously
        Parallel.forEach(
          ParticipantSubscriptions.getInstance().getSubscriptionsForType(ParticipantSubscriptionType.THREDS),
          async (subscription) => {
            const { re } = subscription;
            const builder = Events.baseSystemEventBuilder({ thredId: ThredId.SYSTEM, re });
            builder.mergeValues({ threds: [thredJson] });
            await this.threds.handleMessage({ event: builder.build(), to: [subscription.participantId] });
          },
        );
      },
    );
  }
}
