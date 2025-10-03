import { createClient, RedisClientType } from 'redis';
import { Logger } from '../../thredlib/index.js';
import { PubSub } from '../PubSub.js';
import { Pub } from '../Pub.js';

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
    // TODO: Look at handling the host string farther up the stack
    const redisHost = process.env.REDIS_HOST || 'localhost:6379';
    const client = createClient({
      url: `redis://${redisHost}`,
      socket: {
        reconnectStrategy: (retries) => {
          const delay = Math.min(retries * 50, 2000);
          return delay;
        },
      },
    });

    client.on('error', function (error) {
      Logger.error(error);
    });
    client.on('ready', function () {
      /* Logger.info('Ready'); */
    });
    client.on('reconnect', function () {
      Logger.info('Redis reconnecting...');
    });
    client.on('end', function () {});

    // Connect the client
    client.connect().catch((error) => {
      Logger.error('Failed to connect to Redis:', error);
    });

    return client;
  }
}
