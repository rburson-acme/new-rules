import { createClient } from 'redis';
import { Logger } from '../../thredlib/index.js';
import { KeySubscriber } from '../KeySubscriber.js';

export class RedisKeySubscriber implements KeySubscriber {
  private sub;
  constructor() {
    this.sub = this.newClient();
  }

  public async subscribe(
    patterns: string[],
    notifyFn: (pattern: string, topic: string, message: any) => void,
  ): Promise<void> {
    try {
      await this.sub.pSubscribe(patterns, (message: string, channel: string) => {
        try {
          // For pattern subscriptions, we need to find which pattern matched
          // node-redis doesn't provide the pattern directly in the callback
          // We'll use the channel as both pattern and topic for now
          notifyFn(channel, channel, message);
        } catch (e) {
          Logger.error(e);
        }
      });
    } catch (err) {
      Logger.error('Failed to subscribe: %s', err instanceof Error ? err.message : String(err));
    }
  }

  public async unsubscribe(patterns: string[]): Promise<void> {
    try {
      await this.sub.pUnsubscribe(patterns);
    } catch (err) {
      Logger.error('Failed to punsubscribe: %s', err instanceof Error ? err.message : String(err));
    }
  }

  public async disconnect(): Promise<void> {
    await this.sub.quit();
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
