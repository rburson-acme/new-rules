import Redis from 'ioredis';
import { Logger } from '../../thredlib';
import { PubSub } from '../PubSub';
import { Pub } from '../Pub';

export class RedisPub implements Pub {
  private pub;
  constructor() {
    this.pub = this.newClient();
  }

  public async publish(topic: string, message: Record<string, any>): Promise<void> {
    await this.pub.publish(topic, JSON.stringify(message));
  }

  public async disconnect(): Promise<void> {
    await this.pub.quit();
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
