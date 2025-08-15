import { PubSub } from '../PubSub.js';
import { RedisPub } from './RedisPub.js';
import { RedisSub } from './RedisSub.js';

export class RedisPubSub implements PubSub {
  private pub: RedisPub;
  private sub: RedisSub;
  constructor() {
    this.pub = new RedisPub();
    this.sub = new RedisSub();
  }

  public async publish(topic: string, message: Record<string, any>): Promise<void> {
    return this.pub.publish(topic, message);
  }

  public async subscribe(topics: string[], notifyFn: (topic: string, message: any) => void): Promise<void> {
    return this.sub.subscribe(topics, notifyFn);
  }

  public async unsubscribe(topics: string[]): Promise<void> {
    return this.sub.unsubscribe(topics);
  }

  public async disconnect(): Promise<void> {
    await this.pub.disconnect();
    await this.sub.disconnect();
  }
}
