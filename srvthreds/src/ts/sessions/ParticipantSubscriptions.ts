/**
 * Singleton class that manages subscriptions for participants.
 *
 * This class allows adding any number of subscriptions for each participant, supporting multiple types of subscriptions.
 * Subscriptions can be queried by participant or by subscription type.
 * 
 * **Important:** Removing subscriptions is only possible by type for a given participant; individual subscriptions cannot be removed directly.
 *
 * Internally, the class maintains two collections:
 * - `subscriptionsByParticipant`: Maps participant IDs to their set of subscriptions.
 * - `subscriptionsByType`: Maps subscription types to sets of all subscriptions of that type.
 *
 * Use `ParticipantSubscriptions.getInstance()` to access the singleton instance.
 *
 * @example
 * ```typescript
 * const subs = ParticipantSubscriptions.getInstance();
 * subs.addSubscription('user1', { type: ParticipantSubscriptionType.THREDS });
 * const userSubs = subs.getSubscriptionsForParticipant('user1');
 * subs.removeSubscriptionsOfType('user1', ParticipantSubscriptionType.THREDS);
 * ```
 */
export interface ParticipantSubscription {
    participantId: string;
    type: ParticipantSubscriptionType;
    //filter: string;
    re?: string;
}

export enum ParticipantSubscriptionType {
    THREDS = 'threds',
}

/*
    ParticipantSubscriptions is a singleton class that manages subscriptions for participants.
    It allows adding any number of subscriptions for each participant of any type.
    However, removeing subscriptions is only possible by type, not by individual subscription.
 */
export class ParticipantSubscriptions {

    private static instance: ParticipantSubscriptions;

    private constructor() {}

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
        this.subscriptionsByParticipant.get(subscription.participantId)!.add(subscription);

        // Add to type-based collection
        if (!this.subscriptionsByType.has(subscription.type)) {
            this.subscriptionsByType.set(subscription.type, new Set());
        }
        this.subscriptionsByType.get(subscription.type)!.add(subscription);
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
        // Early return if no subscriptions exist for this participant
        const participantSubs = this.subscriptionsByParticipant.get(participantId);
        if (!participantSubs) return;
        
        // Find and remove matching subscriptions (by type)
        const subsToRemove = [...participantSubs].filter(sub => sub.type === type);
        if (!subsToRemove.length) return;
        
        // Process both collections in a single pass
        subsToRemove.forEach(sub => {
            // Remove from participant collection
            participantSubs.delete(sub);
            
            // Remove from type collection
            const typeSubs = this.subscriptionsByType.get(sub.type);
            typeSubs?.delete(sub) && !typeSubs.size && this.subscriptionsByType.delete(sub.type);
        });
        
        // Clean up empty participant collection
        !participantSubs.size && this.subscriptionsByParticipant.delete(participantId);
    }
}   