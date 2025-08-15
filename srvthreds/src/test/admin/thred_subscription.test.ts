import { ThredSubscriptions } from '../../ts/admin/ThredSubscriptions.js';
import { PubSubFactory } from '../../ts/pubsub/PubSubFactory.js';
import { Logger, LoggerLevel, Message } from '../../ts/thredlib/index.js';
import { EngineConnectionManager, events, withDispatcherPromise, withPromiseHandlers } from '../testUtils.js';
import { adminTestPatternModels } from './adminTestUtils.js';

Logger.setLevel(LoggerLevel.DEBUG);

describe('thred subscription test', function () {
  beforeAll(async () => {
    engineConnMan = await EngineConnectionManager.newEngineInstance(adminTestPatternModels);
    await engineConnMan.purgeAll();
  });
  test('test notify thred creation', async function () {
    let notifyFn: (thredId: string, eventType: string) => void;
    const pr = new Promise((resolve, reject) => {
      notifyFn = withPromiseHandlers(
        async (thredId, eventType) => {
          expect(thredId).toBeDefined();
          thredId0 = thredId;
          await ThredSubscriptions.getInstance().unsubscribeFromThredChanges('testid');
        },
        resolve,
        reject,
      );
    });
    await ThredSubscriptions.getInstance().subscribeToThredChanges('testid', notifyFn!);
    // start a thred
    engineConnMan.eventQ.queue(events.event0);
    return pr;
  });
  test('notify thred transition', async function () {
    let notifyFn: (thredId: string, eventType: string) => void;
    const pr = new Promise((resolve, reject) => {
      notifyFn = withPromiseHandlers(
        async (thredId, eventType) => {
          expect(thredId).toBe(thredId0);
          await ThredSubscriptions.getInstance().unsubscribeFromThredChanges('testid');
        },
        resolve,
        reject,
      );
    });
    await ThredSubscriptions.getInstance().subscribeToThredChanges('testid', notifyFn!);
    engineConnMan.eventQ.queue({ ...events.event1, thredId: thredId0 });
    return pr;
  });
  afterAll(async () => {
    await PubSubFactory.disconnectAll();
    await engineConnMan.purgeAll();
    await engineConnMan.disconnectAll();
  });
});

let engineConnMan: EngineConnectionManager;
let thredId0: string | undefined;
