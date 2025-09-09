import {
  Event, Series,
  Logger,
  Message,
  Connection,
  SocketIOConnection
} from '../thredlib/index.js';

interface Subscriber {
  notifyFn: (message: Message) => void;
}
/**
 * RemoteConnectionManager
 * @description Manages message subscriptions and publishing.
 *  Allows for the multiplexing of message to multiple subscribers, thourgh the use of filters.
 */
export class RemoteConnectionManager {
  private subscribers: Set<Subscriber> = new Set();
  private connection?: Connection;

  /**
   * Connect to server
   * @param url - URL of server
   * @param options - connection options
   */
  connect(url: string, options: {}): Promise<void> {
    this.connection = new SocketIOConnection(url, options);
    const connect = () => (this.connection as Connection).setListener(this.connectionListener);
    return this.connection.connect().then(connect);
  }

  /**
   * Disconnect from server
   */
  disconnect(): void {
    this.connection?.disconnect();
  }

  /**
   * Publish an event
   * @param event - event to publish
   */
  publish(event: Event): void {
    if (!this.connection) throw new Error(`Engine not connected`);
    this.connection.send(event);
  }

  /**
   * Subscribe to messages
   * @param notifyFn - function to call when message is received
   */
  subscribe(notifyFn: (message: Message) => void): void {
    this.subscribers.add({ notifyFn });
  }

  /**
   * Remove a subscription
   * @param notifyFn - subscription to remove
   */
  unsubscribe(notifyFn: (message: Message) => void): void {
    this.subscribers.forEach((subscriber) => {
      if (subscriber.notifyFn === notifyFn) {
        this.subscribers.delete(subscriber);
      }
    });
  }

  /**
   * Remove all subscriptions
   */
  unsubscribeAll(): void {
    this.subscribers.clear();
  }

  private connectionListener = async (message: Message): Promise<void> => {
    return Series.forEach([...this.subscribers], async (subscriber) => {
        try {
          subscriber.notifyFn(message);
        } catch (e: any) {
          Logger.error(`RemoteConnectionManager::Error in subscriber: ${e.message}`, e);
        }
      }
    );
  };

}
