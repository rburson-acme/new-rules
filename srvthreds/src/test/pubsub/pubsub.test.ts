import { PubSub } from '../../ts/pubsub/PubSub';
import { PubSubFactory } from '../../ts/pubsub/PubSubFactory';
import { Logger, LoggerLevel } from '../../ts/thredlib';
import { delay, withPromiseHandlers } from '../testUtils';

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
    await PubSubFactory.getPubSub().subscribe(['test'], notifyFn!);
    PubSubFactory.getPubSub().publish('test', { value: 'hello' });
    return pr;
  });
  afterAll(async () => {
    await PubSubFactory.getPubSub().disconnect();
  });
});
