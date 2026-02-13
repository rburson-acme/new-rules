import { PatternModel, Logger, LoggerLevel } from '../../ts/thredlib/index.js';
import { events, delay, EngineConnectionManager, withDispatcherPromise } from '../testUtils.js';

Logger.setLevel(LoggerLevel.INFO);

describe('allowUnboundEvents', function () {
  beforeAll(async () => {
    connMan = await EngineConnectionManager.newEngineInstance(patternModels);
    await connMan.purgeAll();
  });
  // send event0 (unbound) to match the first reaction and start the thred
  test('match first reaction and start thred', function () {
    const pr = withDispatcherPromise(connMan.engine.dispatchers, async (message) => {
      expect(await connMan.engine.numThreds).toBe(1);
      expect(message.event.data?.title).toBe('outbound.event0');
      expect(message.to).toContain('outbound.event0.recipient');
      thredId = message.event.thredId;
    });
    connMan.eventQ.queue(events.event0);
    return pr;
  });
  // send event1 without a thredId - should match the second reaction via allowUnboundEvents
  test('match second reaction with unbound event', function () {
    const pr = withDispatcherPromise(connMan.engine.dispatchers, async (message) => {
      expect(await connMan.engine.numThreds).toBe(1);
      expect(message.event.data?.title).toBe('outbound.event1');
      expect(message.to).toContain('outbound.event1.recipient');
      expect(message.event.thredId).toBe(thredId);
    });
    // send event1 without thredId - it's unbound
    connMan.eventQ.queue(events.event1);
    return pr;
  });
  // send event2 without a thredId - should NOT match the third reaction (no allowUnboundEvents)
  test('unbound event should not match reaction without allowUnboundEvents', async function () {
    let dispatched = false;
    connMan.engine.dispatchers.length = 0;
    connMan.engine.dispatchers.push(async () => {
      dispatched = true;
    });
    connMan.eventQ.queue(events.event2);
    await delay(500);
    expect(dispatched).toBe(false);
  });
  afterAll(async () => {
    await connMan.stopAllThreds();
    await connMan.purgeAll();
    await connMan.disconnectAll();
  });
});

let thredId: string | undefined;
let connMan: EngineConnectionManager;

const patternModels: PatternModel[] = [
  {
    name: 'Unbound Events Test',
    instanceInterval: 0,
    maxInstances: 0,
    reactions: [
      {
        name: 'start',
        condition: {
          type: 'filter',
          xpr: "$event.type = 'inbound.event0'",
          transform: {
            eventDataTemplate: {
              title: 'outbound.event0',
            },
          },
          publish: {
            to: ['outbound.event0.recipient'],
          },
        },
      },
      {
        name: 'receive_unbound',
        allowUnboundEvents: true,
        condition: {
          type: 'filter',
          xpr: "$event.type = 'inbound.event1'",
          transform: {
            eventDataTemplate: {
              title: 'outbound.event1',
            },
          },
          publish: {
            to: ['outbound.event1.recipient'],
          },
        },
      },
      {
        name: 'bound_only',
        condition: {
          type: 'filter',
          xpr: "$event.type = 'inbound.event2'",
          transform: {
            eventDataTemplate: {
              title: 'outbound.event2',
            },
          },
          publish: {
            to: ['outbound.event2.recipient'],
          },
          transition: {
            name: '$terminate',
          },
        },
      },
    ],
  },
];
