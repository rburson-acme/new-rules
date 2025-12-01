import { Expression } from '../expression/Expression.js';
import { SimpleContext } from '../expression/SimpleContext.js';
import { Series } from '../lib/Async.js';
import { Logger } from '../lib/Logger.js';
import { SocketIOConnection } from './SocketIOConnection.js';
/**
 * EventManager
 * @description Manages event subscriptions and publishing.
 *  Allows for the multiplexing of events to multiple subscribers, thourgh the use of filters.
 */
export class EventManager {
    subscribers = new Set();
    connection;
    xprContext = new SimpleContext();
    /**
     * Connect to server
     * @param url - URL of server
     * @param options - connection options
     */
    connect(url, options) {
        this.connection = new SocketIOConnection(url, options);
        const connect = () => this.connection.setListener(this.connectionListener);
        return this.connection.connect().then(connect);
    }
    /**
     * Disconnect from server
     */
    disconnect() {
        this.connection?.disconnect();
    }
    /**
     * Publish an event
     * @param event - event to publish
     */
    publish(event) {
        if (!this.connection)
            throw new Error(`Engine not connected`);
        this.connection.send(event);
    }
    /**
     * Publish an event and expect a response
     * @param event - event to publish
     * @param notifyFn - function to call when event is received
     */
    exchange(event, notifyFn, options) {
        this.subscribeOnce(notifyFn, { ...options, filter: `$event.re = '${event.id}'` });
        this.publish(event);
    }
    /**
     * Publish an event and return a promise that resolves when the response is received.
     * @param event - event to publish
     * @description Publish an event and return a promise that resolves when the response is received.
     *  The response is expected to have a 're' value that matches the event ID.
     *  This is useful for request-response patterns.
     * @example
     * ```typescript
     * const response = await eventManager.exchangeWithPromise(event);
     * expect(response.data?.title).toBe('expected response title');
     * ```
     * @param options
     * @returns {Promise<Event>} - Promise that resolves with the response event
     */
    exchangeWithPromise(event, options) {
        return new Promise((resolve, reject) => {
            try {
                this.subscribeOnce(resolve, { ...options, filter: `$event.re = '${event.id}'` });
                this.publish(event);
            }
            catch (e) {
                Logger.error(`EventManager::Error in exchangeWithPromise: ${e.message}`, e);
                reject(e);
            }
        });
    }
    /**
     * Subscribe to events
     * @param notifyFn - function to call when event is received
     * @param options.filter - filter expression to apply to event
     */
    subscribe(notifyFn, options) {
        this.subscribers.add({ notifyFn, options });
    }
    /**
     * Subscribe to events and remove subscription after first event
     * @param notifyFn - function to call when event is received
     * @param options.filter - filter expression to apply to event
     *  e.g. { filter: "$event.type = 'example.event'" }
     */
    subscribeOnce(notifyFn, options = {}) {
        this.subscribers.add({ notifyFn, options: { ...options, evict: true } });
    }
    /**
     * Subscribe to a single event and remove subscription after receiving the first event that matches the filter.
     * @param options.filter - filter expression to apply to event
     *  e.g. { filter: "$event.type = 'example.event'" }
     *  @param event - optional event to publish after subscribing
     * @returns {Promise<Event>} - Promise that resolves with the first event that matches the filter
     */
    subscribeOnceWithPromise(options = {}, event) {
        return new Promise((resolve, reject) => {
            try {
                this.subscribeOnce(resolve, { ...options, evict: true });
                if (event)
                    this.publish(event);
            }
            catch (e) {
                Logger.error(`EventManager::Error in subscribeOnceWithPromise: ${e.message}`, e);
                reject(e);
            }
        });
    }
    /**
     * Remove a subscription
     * @param notifyFn - subscription to remove
     */
    unsubscribe(notifyFn) {
        this.subscribers.forEach((subscriber) => {
            if (subscriber.notifyFn === notifyFn) {
                this.subscribers.delete(subscriber);
            }
        });
    }
    /**
     * Remove all subscriptions
     */
    unsubscribeAll() {
        this.subscribers.clear();
    }
    connectionListener = async (event) => {
        return Series.forEach([...this.subscribers], async (subscriber) => {
            if (await this.matchesFilter(event, subscriber.options?.filter)) {
                try {
                    if (subscriber.options?.evict)
                        this.subscribers.delete(subscriber);
                    subscriber.notifyFn(event);
                }
                catch (e) {
                    Logger.error(`EventManager::Error in subscriber: ${e.message}`, e);
                }
            }
        });
    };
    async matchesFilter(event, filter) {
        if (!filter)
            return true;
        try {
            const expr = new Expression(filter);
            return !!(await expr.apply({ event, context: this.xprContext }));
        }
        catch (e) {
            Logger.error(`EventManager::Invalid filter: ${e.message}`, e);
            return false;
        }
    }
}
