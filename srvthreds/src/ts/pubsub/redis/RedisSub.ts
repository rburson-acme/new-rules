import Redis from 'ioredis';
import { Logger } from '../../thredlib';
import { PubSub } from '../PubSub';
import { Sub } from '../Sub';

export class RedisSub implements Sub {
  private sub;
  constructor() {
    this.sub = this.newClient();
  }

  public async subscribe(
    topics: string[],
    notifyFn: (topic: string, message: Record<string, any>) => void,
  ): Promise<void> {
    await this.sub.subscribe(...topics, (err, count) => {
      if (err) {
        Logger.error('Failed to subscribe: %s', err.message);
      }
    });
    this.sub.on('message', (topic, message) => {
      try {
        notifyFn(topic, JSON.parse(message));
      } catch (e) {
        Logger.error(e);
      }
    });
  }

  public async unsubscribe(topics: string[]): Promise<void> {
    await this.sub.unsubscribe(...topics, (err, count) => {
      if (err) {
        Logger.error('Failed to unsubscribe: %s', err.message);
      }
    });
  }

  public async disconnect(): Promise<void> {
    await this.sub.quit();
  }

  private newClient() {
    const client = new Redis({
      // This is the default value of `retryStrategy`
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });
    client.on('error', function (error) {
      Logger.error(error);
    });
    client.on('ready', function () {
      /* Logger.info('Ready'); */
    });
    client.on('reconnecting', function () {
      Logger.info('Redis reconnecting...');
    });
    client.on('end', function () {});
    return client;
  }
}
