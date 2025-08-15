import { createClient } from 'redis';
import { Logger } from '../../thredlib/index.js';
import { PubSub } from '../PubSub.js';
import { Sub } from '../Sub.js';

export class RedisSub implements Sub {
  private sub;
  constructor() {
    this.sub = this.newClient();
  }

  public async subscribe(
    topics: string[],
    notifyFn: (topic: string, message: Record<string, any>) => void,
  ): Promise<void> {
    try {
      await this.sub.subscribe(topics, (message, channel) => {
        try {
          notifyFn(channel, JSON.parse(message));
        } catch (e) {
          Logger.error(e);
        }
      });
    } catch (err) {
      Logger.error('Failed to subscribe: %s', err instanceof Error ? err.message : String(err));
    }
  }

  public async unsubscribe(topics: string[]): Promise<void> {
    try {
      await this.sub.unsubscribe(topics);
    } catch (err) {
      Logger.error('Failed to unsubscribe: %s', err instanceof Error ? err.message : String(err));
    }
  }

  public async disconnect(): Promise<void> {
    await this.sub.quit();
  }

  private newClient() {
    const client = createClient({
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
