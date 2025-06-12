import Redis from 'ioredis';
import { Logger } from '../../thredlib';
import { KeySubscriber } from '../KeySubscriber';

export class RedisKeySubscriber implements KeySubscriber {
  private sub;
  constructor() {
    this.sub = this.newClient();
  }

  public async subscribe(
    patterns: string[],
    notifyFn: (pattern: string, topic: string, message: any) => void,
  ): Promise<void> {
    await this.sub.psubscribe(...patterns, (err, count) => {
      if (err) {
        Logger.error('Failed to subscribe: %s', err.message);
      }
    });
    this.sub.on('pmessage', (pattern, topic, message) => {
      try {
        notifyFn(pattern, topic, message);
      } catch (e) {
        Logger.error(e);
      }
    });
  }

  public async unsubscribe(patterns: string[]): Promise<void> {
    await this.sub.punsubscribe(...patterns, (err, count) => {
      if (err) {
        Logger.error('Failed to punsubscribe: %s', err.message);
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
