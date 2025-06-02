import { BrokerAsPromised } from 'rascal';
import { QService, QMessage } from '../QService.js';
import { RemoteQBroker } from './RemoteQBroker.js';
import { Logger } from '../../thredlib/index.js';

export class RemoteQService<T> implements QService<T> {
  // holds incoming messages, in arrival order
  private q: QMessage<T>[] = [];
  // holds 'IOU' callback functions that will be called when a message arrives
  private notifyQ: (() => void)[] = [];

  static async newInstance<T>(params: {
    qBroker: RemoteQBroker;
    subName?: string;
    pubName?: string;
  }): Promise<RemoteQService<T>> {
    const { qBroker, subName, pubName } = params;
    const instance = new RemoteQService<T>(qBroker, pubName);
    await instance.connect();
    if (subName) {
      await instance.subscribe(subName);
    }
    return instance;
  }

  private constructor(
    private readonly qBroker: RemoteQBroker,
    private readonly pubName?: string,
  ) {}

  /* Connect the broker */
  async connect(): Promise<void> {
    if (!this.qBroker.isConnected) {
      return this.qBroker.connect();
    }
  }

  /* Disconnect all connections/services */
  // move this to an abstracted broker
  disconnect(): Promise<void> {
    // Note: if there are unack'd messages unsubscribeAll and shutdown will block indefinitely
    return this.qBroker.disconnect();
  }

  /*
    Return the next message in the Q if available
    If no meessages are in the Q, return a promise that will resolve when a message is available
    This uses the 'notifyQ' hold callback functions that will resolve the promise when a message arrives
  */
  async pop(topics?: string[]): Promise<QMessage<T>> {
    const { q } = this;
    if (q.length) {
      const next = this.q.pop();
      return next as never;
    }
    return new Promise((resolve) => {
      this.notifyQ.unshift(() => {
        const next = this.q.pop();
        resolve(next as never);
      });
    });
  }

  /*
        Remove all local messages
        Does not remove any listeners waiting on messages
    */
  reset() {
    this.q = [];
  }

  /*
    @TODO: In the future, handle backpressure from the broker
    // add these handlers to QBroker
    broker.on('busy', ({ vhost, mode, queue, size, available, borrowed, min, max }) => {
      // pause publishing (block the queue)
    });

    broker.on('ready', ({ vhost, mode, queue, size, available, borrowed, min, max }) => {
      // unpause publishing (unblock the queue)
    });
  */

  async queue(message: QMessage<T>): Promise<void> {
    if (!this.pubName) {
      throw Error(`No pub_name configued`);
    }
    // figure out how to do multiple topics
    const routingKey = message.topics?.[0];
    const additionalOpts = routingKey ? { routingKey } : {};
    const pub = await this.broker.publish(this.pubName, message, additionalOpts);

    return new Promise((resolve, reject) => {
      pub
        ?.on('success', (messageId) => {
          resolve();
        })
        .on('error', (err, messageId) => {
          Logger.error(`${this.pubName}: Publisher error`, err, messageId, routingKey);
          reject(err);
        })
        .on('return', (message) => {
          const err = `${this.pubName} Message was returned: ${message.properties.messageId} on ${routingKey}`;
          Logger.error(err);
          reject(err);
        });
    });
  }

  /*
        Acknowledge receipt of message
    */
  async delete(message: QMessage<T>): Promise<void> {
    return (message.replyHandle as any)?.ackOrNack();
  }

  /*
        Move to dead-letter q with error
    */
  async reject(message: QMessage<T>, err?: Error): Promise<void> {
    return (message.replyHandle as any)?.ackOrNack(err, { strategy: 'nack' });
  }

  /*
        Try again
    */
  async requeue(message: QMessage<T>, err?: Error): Promise<void> {
    // move to the back of the Q (after defer time)
    return (message.replyHandle as any)?.ackOrNack(
      err,
      { strategy: 'republish', defer: 3000, attempts: 10 },
      { strategy: 'nack' },
    );
  }

  // move this to the remote (and abstract) broker
  async deleteAll(): Promise<void> {
    await this.broker.purge();
  }

  // move this to the remote (and abstract) broker
  async unsubscribeAll(): Promise<void> {
    // Note: if there are unack'd messages unsubscribeAll and shutdown will block indefinitely
    await this.broker.unsubscribeAll();
  }

  /*
    Subscribe to a remote queue
    Incoming messages are added to the local Q
    If there are any listeners waiting for messages, they will be notified via the 'IOU' callback function
  */
  private async subscribe(subName: string): Promise<void> {
    const sub = await this.broker.subscribe(subName);
    sub
      ?.on('message', (message, content, ackOrNack) => {
        //Logger.info(`${subName} got ${content.id}`);
        this.q.unshift({ ...content, replyHandle: { ackOrNack } });
        const next = this.notifyQ.pop();
        next && next();
      })
      .on('error', (err) => {
        Logger.error(`${subName}: Subscriber error`, err);
      })
      .on('invalid_content', (err, message, ackOrNack) => {
        Logger.error('RemoteQ: got invalid content', err);
        ackOrNack(err, { strategy: 'nack' });
      })
      .on('redeliveries_exceeded', (err, message, ackOrNack) => {
        console.error('RemoteQ: redeliveries exceeded', err);
        ackOrNack(err, { strategy: 'nack' });
      });
  }

  private get broker(): BrokerAsPromised {
    if (!this.qBroker.broker) throw Error('RemoteQBroker not connected!');
    return this.qBroker.broker;
  }
}
