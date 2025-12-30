import { Logger, LoggerLevel, PatternModel } from '../../ts/thredlib/index.js';

import { EngineConnectionManager, events, withDispatcherPromise, delay } from '../testUtils.js';

Logger.setLevel(LoggerLevel.DEBUG);

/*
  This tests pattern constraints on new thred creation:
  - maxInstances: maximum number of concurrent thred instances
  - instanceInterval: minimum time interval between thred creation
*/
describe('pattern constraints', function () {
  beforeAll(async () => {
    connMan = await EngineConnectionManager.newEngineInstance(patternModels);
    await connMan.purgeAll();
  });

  // Test maxInstances constraint
  test('maxInstances: create first thred (should succeed)', function () {
    const pr = withDispatcherPromise(connMan.engine.dispatchers, async (message) => {
      expect(message.event.data?.title).toBe('maxInstances.response');
      expect(message.to).toContain('test.recipient');
      thredId1 = message.event.thredId;
    });
    connMan.eventQ.queue(events.event0);
    return pr;
  });

  test('maxInstances: create second thred (should succeed)', function () {
    const pr = withDispatcherPromise(connMan.engine.dispatchers, async (message) => {
      expect(message.event.data?.title).toBe('maxInstances.response');
      expect(message.to).toContain('test.recipient');
      thredId2 = message.event.thredId;
    });
    connMan.eventQ.queue(events.event0);
    return pr;
  });

  test('maxInstances: attempt third thred (should fail)', async function () {
    // Third attempt should fail because maxInstances is 2
    try {
      await connMan.engine.consider(events.event0);
      // Should not reach here
      expect(true).toBe(false);
    } catch (e: any) {
      expect(e).toBeInstanceOf(Error);
    }
  });

  test('maxInstances: terminate first thred', function () {
    // Send finish event to terminate thredId1
    const finishEvent = {
      id: 'finish-1',
      type: 'inbound.finish',
      thredId: thredId1,
      source: {
        id: 'test.dataset',
      },
    };
    connMan.eventQ.queue(finishEvent);
  });

  test('maxInstances: create new thred after termination (should succeed)', async function () {
    // Should succeed because we now only have 1 active thred (thredId2)
    const pr = withDispatcherPromise(connMan.engine.dispatchers, async (message) => {
      expect(message.event.data?.title).toBe('maxInstances.response');
      expect(message.to).toContain('test.recipient');
    });
    connMan.eventQ.queue(events.event0);
    return pr;
  });

  // Test instanceInterval constraint
  test('instanceInterval: create first thred (should succeed)', function () {
    const pr = withDispatcherPromise(connMan.engine.dispatchers, async (message) => {
      expect(message.event.data?.title).toBe('instanceInterval.response');
      expect(message.to).toContain('test.recipient');
      thredId3 = message.event.thredId;
    });
    connMan.eventQ.queue(events.event1);
    return pr;
  });

  test('instanceInterval: attempt second thred too quickly (should fail)', async function () {
    // Second attempt should fail because instanceInterval is 1000ms
    try {
      await connMan.engine.consider(events.event1);
      // Should not reach here
      expect(true).toBe(false);
    } catch (e: any) {
      expect(e).toBeInstanceOf(Error);
    }
  });

  test('instanceInterval: create second thred after interval (should succeed)', async function () {
    // Wait for interval to pass
    await delay(1100);
    const pr = withDispatcherPromise(connMan.engine.dispatchers, async (message) => {
      expect(message.event.data?.title).toBe('instanceInterval.response');
      expect(message.to).toContain('test.recipient');
      thredId4 = message.event.thredId;
    });
    connMan.eventQ.queue(events.event1);
    return pr;
  });

  // cleanup in case of failure
  afterAll(async () => {
    await connMan.stopAllThreds();
    await connMan.purgeAll();
    await connMan.disconnectAll();
  });
});

let thredId1: string | undefined;
let thredId2: string | undefined;
let thredId3: string | undefined;
let thredId4: string | undefined;

const patternModels: PatternModel[] = [
  {
    name: 'MaxInstances Test',
    instanceInterval: 0,
    maxInstances: 2, // Only allow 2 concurrent instances
    reactions: [
      {
        condition: {
          type: 'filter',
          xpr: "$event.type = 'inbound.event0'",
          transform: {
            eventDataTemplate: {
              title: 'maxInstances.response',
            },
          },
          publish: {
            to: ['test.recipient'],
          },
          transition: {
            name: '$next',
          },
        },
      },
      {
        condition: {
          type: 'filter',
          xpr: "$event.type = 'inbound.finish'",
          transition: {
            name: '$terminate',
          },
        },
      },
    ],
  },
  {
    name: 'InstanceInterval Test',
    instanceInterval: 1000, // Require 1 second between instances
    maxInstances: 0,
    reactions: [
      {
        condition: {
          type: 'filter',
          xpr: "$event.type = 'inbound.event1'",
          transform: {
            eventDataTemplate: {
              title: 'instanceInterval.response',
            },
          },
          publish: {
            to: ['test.recipient'],
          },
          transition: {
            name: '$terminate',
          },
        },
      },
    ],
  },
];

let connMan: EngineConnectionManager;
