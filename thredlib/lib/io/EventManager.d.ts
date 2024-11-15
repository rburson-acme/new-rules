import { Event } from '../core/Event.js';
interface SubscriberOptions {
    filter?: string;
    evict?: boolean;
}
/**
 * EventManager
 * @description Manages event subscriptions and publishing.
 *  Allows for the multiplexing of events to multiple subscribers, thourgh the use of filters.
 */
export declare class EventManager {
    private subscribers;
    private connection?;
    private xprContext;
    /**
     * Connect to server
     * @param url - URL of server
     * @param options - connection options
     */
    connect(url: string, options: {}): Promise<void>;
    /**
     * Disconnect from server
     */
    disconnect(): void;
    /**
     * Publish an event
     * @param event - event to publish
     */
    publish(event: Event): void;
    /**
     * Publish an event and expect a response
     * @param event - event to publish
     * @param notifyFn - function to call when event is received
     */
    exchange(event: Event, notifyFn: (event: Event) => void, options?: SubscriberOptions): void;
    /**
     * Subscribe to events
     * @param notifyFn - function to call when event is received
     * @param options.filter - filter expression to apply to event
     */
    subscribe(notifyFn: (event: Event) => void, options?: SubscriberOptions): void;
    /**
     * Subscribe to events and remove subscription after first event
     * @param notifyFn - function to call when event is received
     * @param options.filter - filter expression to apply to event
     *  e.g. { filter: "$event.type = 'example.event'" }
     */
    subscribeOnce(notifyFn: (event: Event) => void, options?: SubscriberOptions): void;
    /**
     * Remove a subscription
     * @param notifyFn - subscription to remove
     */
    unsubscribe(notifyFn: (event: Event) => void): void;
    /**
     * Remove all subscriptions
     */
    unsubscribeAll(): void;
    private connectionListener;
    private matchesFilter;
}
export {};
