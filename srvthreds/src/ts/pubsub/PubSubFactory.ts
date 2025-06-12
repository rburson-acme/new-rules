import { Logger } from '../thredlib/index.js';
import { Pub } from './Pub.js';
import { RedisPub } from './redis/RedisPub.js';
import { RedisSub } from './redis/RedisSub.js';
import { Sub } from './Sub.js';

export class PubSubFactory {
  private static pub?: Pub;
  private static sub?: Sub;

  static getPub(): Pub {
    if (!PubSubFactory.pub) {
      PubSubFactory.pub = new RedisPub();
    }
    return PubSubFactory.pub;
  }

  static getSub(): Sub {
    if (!PubSubFactory.sub) {
      PubSubFactory.sub = new RedisSub();
    }
    return PubSubFactory.sub;
  }

  static async disconnectAll(): Promise<void> {
    try {
      await PubSubFactory.sub?.disconnect();
      await PubSubFactory.pub?.disconnect();
    } catch (e) {
      Logger.error(`disconnectAll: `, e);
    }
    PubSubFactory.pub = undefined;
    PubSubFactory.sub = undefined;
  }
}
