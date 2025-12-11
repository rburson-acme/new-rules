import { createClient, RedisClientType } from 'redis';
import { Logger } from '../../thredlib/index.js';
import { PubSub } from '../PubSub.js';
import { Pub } from '../Pub.js';
import { redisConfig } from '../../config/RedisConfig.js';

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

    const client = createClient(redisConfig());

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
