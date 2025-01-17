import { Logger, LoggerLevel, PatternModel } from '../../ts/thredlib/index.js';

import { EngineConnectionManager, events, withDispatcherPromise, withReject } from '../testUtils.js';

Logger.setLevel(LoggerLevel.WARN);

describe.skip('authorization tests', function () {
  beforeAll(async () => {
    connMan = await EngineConnectionManager.newEngineInstance(patternModels);
    await connMan.purgeAll();
  });
  test.skip('should not allow source', function () {
    const pr = withDispatcherPromise(connMan.engine.dispatchers, async (message) => {
      const { event } = message;
      expect(await connMan.engine.numThreds).toBe(0);
      expect(event.type).toBe('org.wt.tell');
      expect(event.data?.content?.values).toBeFalsy();
      expect(event.data?.content?.error).toBeTruthy();
    });
    connMan.eventQ.queue({ ...events.event0, ...{ source: { id: 'unauthorized.source' } } });
    return pr;
  });
  // match the first event and start the thred
  test('match filter and transition to second reaction', function () {
    const pr = withDispatcherPromise(connMan.engine.dispatchers, async (message) => {
      expect(await connMan.engine.numThreds).toBe(1);
      expect(message.event.data?.title).toBe('outbound.event0');
      expect(message.to).toContain('outbound.event0.recipient');
      thredId = message.event.thredId;
    });
    connMan.eventQ.queue(events.event0);
    return pr;
  });
  test('second reaction should not allow source', function () {
    const pr = withDispatcherPromise(connMan.engine.dispatchers, async (message) => {
      const { event } = message;
      expect(await connMan.engine.numThreds).toBe(1);
      expect(event.type).toBe('org.wt.tell');
      expect(event.data?.content?.values).toBeFalsy();
      expect(event.data?.content?.error).toBeTruthy();
    });
    connMan.eventQ.queue({ ...events.event1, ...{ thredId, source: { id: 'unauthorized.source' } } });
    return pr;
  });
  test('match filter and transition to third reaction', function () {
    const pr = withDispatcherPromise(connMan.engine.dispatchers, async (message) => {
      expect(await connMan.engine.numThreds).toBe(1);
      expect(message.event.data?.title).toBe('outbound.event1');
      expect(message.to).toContain('outbound.event1.recipient');
    });
    connMan.eventQ.queue({ ...events.event1, thredId });
    return pr;
  });
  test('third reaction should allow all sources', function () {
    const pr = withDispatcherPromise(connMan.engine.dispatchers, async (message) => {
      expect(await connMan.engine.numThreds).toBe(1);
      expect(message.event.data?.title).toBe('outbound.event2');
      expect(message.to).toContain('outbound.event2.recipient');
    });
    connMan.eventQ.queue({ ...events.event2, ...{ thredId, source: { id: 'unauthorized.source' } } });
    return pr;
  });
  // cleanup in case of failure
  afterAll(async () => {
    await connMan.stopAllThreds();
    await connMan.purgeAll();
    await connMan.disconnectAll();
  });
});

let thredId: string | undefined;

const patternModels: PatternModel[] = [
  {
    name: 'Stateless Test',
    instanceInterval: 0,
    maxInstances: 0,
    reactions: [
      {
        allowedSources: 'test.dataset',
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
        name: 'event1reaction',
        allowedSources: ['some.source', 'test.dataset'],
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
        name: 'event2reaction',
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
        },
      },
    ],
  },
];

let connMan: EngineConnectionManager;
