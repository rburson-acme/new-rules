import { Logger } from '../thredlib/index.js';
import { KeySubscriber } from './KeySubscriber.js';
import { RedisKeySubscriber } from './redis/RedisKeySubscriber.js';

export class KeySubscriberFactory {
  private static keySubscriber?: KeySubscriber;

  static getKeySubscriber(): KeySubscriber {
    if (!KeySubscriberFactory.keySubscriber) {
      KeySubscriberFactory.keySubscriber = new RedisKeySubscriber();
    }
    return KeySubscriberFactory.keySubscriber;
  }

  static async disconnectAll(): Promise<void> {
    try {
      await KeySubscriberFactory.keySubscriber?.disconnect();
    } catch (e) {
      Logger.error(`disconnectAll: `, e);
    }
    KeySubscriberFactory.keySubscriber = undefined;
  }
}
