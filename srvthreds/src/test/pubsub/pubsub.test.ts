import { PubSub } from '../../ts/pubsub/PubSub.js';
import { PubSubFactory } from '../../ts/pubsub/PubSubFactory.js';
import { Logger, LoggerLevel } from '../../ts/thredlib/index.js';
import { delay, withPromiseHandlers } from '../testUtils.js';

Logger.setLevel(LoggerLevel.INFO);

describe('pubsub test', function () {
  test('pubsub', async function () {
    let notifyFn: (topic: string, message: Record<string, any>) => void;
    const pr = new Promise((resolve, reject) => {
      notifyFn = withPromiseHandlers(
        (topic, message) => {
          expect(topic).toBe('test');
          expect(message.value).toBe('hello');
        },
        resolve,
        reject,
      );
    });
    await PubSubFactory.getSub().subscribe(['test'], notifyFn!);
    PubSubFactory.getPub().publish('test', { value: 'hello' });
    return pr;
  });
  afterAll(async () => {
    await PubSubFactory.disconnectAll();
  });
});
