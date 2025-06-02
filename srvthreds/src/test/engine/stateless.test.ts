import { Logger, LoggerLevel, PatternModel } from '../../ts/thredlib/index.js';

import { EngineConnectionManager, events, withDispatcherPromise, withReject } from '../testUtils.js';

Logger.setLevel(LoggerLevel.INFO);

describe('stateless', function () {
  beforeAll(async () => {
    connMan = await EngineConnectionManager.newEngineInstance(patternModels);
    await connMan.purgeAll();
  });
  // match the first event and start the thred
  test('match filter', function () {
    const pr = withDispatcherPromise(connMan.engine.dispatchers, async (message) => {
      expect(await connMan.engine.numThreds).toBe(1);
      expect(message.event.data?.title).toBe('outbound.event0');
      expect(message.to).toContain('outbound.event0.recipient');
      thredId = message.event.thredId;
    });
    connMan.eventQ.queue(events.event0);
    return pr;
  });
  // should match first part of 'and' condition (and store state)
  test('and condition', function () {
    return connMan.engine.consider({ ...events.event1, thredId });
  });
  // should reinstitute state from storage and match second part of and condition
  test('and condition', async function () {
    // rebuild engine and use stored state
    await initEngine();
    const pr = withDispatcherPromise(connMan.engine.dispatchers, (message) => {
      expect(message.event.data?.title).toBe('outbound.event1');
      expect(message.to).toContain('outbound.event1.recipient');
    });
    connMan.eventQ.queue({ ...events.event1a, thredId });
    return pr;
  });
  test('forward condition', async function () {
    // rebuild engine and use stored state
    await initEngine();
    const pr = new Promise<void>((resolve, reject) => {
      connMan.engine.dispatchers = [
        withReject((message) => {
          expect(message.event.data?.title).toBe('outbound.event2');
          expect(message.to).toContain('outbound.event2.recipient');
          connMan.engine.dispatchers = [
            withReject((message) => {
              expect(message.event.data?.title).toBe('outbound.event2a');
              expect(message.to).toContain('outbound.event2a.recipient');
              resolve();
            }, reject),
          ];
        }, reject),
      ];
    });
    connMan.eventQ.queue({ ...events.event2, thredId });
    return pr;
  });
  test('replay condition', async function () {
    // rebuild engine and use stored state
    await initEngine();
    const pr = new Promise<void>((resolve, reject) => {
      connMan.engine.dispatchers = [
        withReject((message) => {
          expect(message.event.data?.title).toBe('outbound.event3');
          expect(message.to).toContain('outbound.event3.recipient');
          connMan.engine.dispatchers = [
            withReject((message) => {
              expect(message.event.data?.title).toBe('outbound.event2');
              expect(message.to).toContain('outbound.event2.recipient');
              connMan.engine.dispatchers = [
                withReject((message) => {
                  expect(message.event.data?.title).toBe('outbound.event2a');
                  expect(message.to).toContain('outbound.event2a.recipient');
                  resolve();
                }, reject),
              ];
            }, reject),
          ];
        }, reject),
      ];
    });
    connMan.eventQ.queue({ ...events.event3, thredId });
    return pr;
  });
  test('complete thred', async function () {
    // rebuild engine and use stored state
    await initEngine();
    const pr = withDispatcherPromise(connMan.engine.dispatchers, (message) => {
      expect(message.event.data?.title).toBe('outbound.event4');
      expect(message.to).toContain('outbound.event4.recipient');
    });
    connMan.eventQ.queue({ ...events.event4, thredId });
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
        condition: {
          type: 'and',
          operands: [
            {
              type: 'filter',
              xpr: "$event.type = 'inbound.event1'",
            },
            {
              type: 'filter',
              xpr: "$event.type = 'inbound.event1a'",
            },
          ],
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
          onTrue: { xpr: "$setLocal('event2', $event)" },
          transform: {
            eventDataTemplate: {
              title: 'outbound.event2',
            },
          },
          publish: {
            to: ['outbound.event2.recipient'],
          },
          transition: {
            name: '$next',
            input: 'forward',
          },
        },
      },
      {
        name: 'event2areaction',
        condition: {
          type: 'filter',
          xpr: "$event.type = 'inbound.event2'",
          transform: {
            eventDataTemplate: {
              title: 'outbound.event2a',
            },
          },
          publish: {
            to: ['outbound.event2a.recipient'],
          },
          transition: {
            name: 'event3reaction',
          },
        },
      },
      {
        name: 'event3reaction',
        condition: {
          type: 'or',
          operands: [
            {
              type: 'filter',
              xpr: "$event.type = 'inbound.event3'",
              transform: {
                eventDataTemplate: {
                  title: 'outbound.event3',
                },
              },
              publish: {
                to: ['outbound.event3.recipient'],
              },
              transition: {
                name: 'event2reaction',
                input: 'local',
                localName: 'event2',
              },
            },
            {
              type: 'filter',
              xpr: "$event.type = 'inbound.event4'",
              transform: {
                eventDataTemplate: {
                  title: 'outbound.event4',
                },
              },
              publish: {
                to: ['outbound.event4.recipient'],
              },
              transition: {
                name: '$terminate',
              },
            },
          ],
        },
      },
    ],
  },
];

let connMan: EngineConnectionManager;

async function initEngine() {
  await connMan.disconnectAll();
  connMan = await EngineConnectionManager.newEngineInstance(patternModels);
}

/*
  test('forward condition', async function () {
    // rebuild engine and use stored state
    await initEngine();
    const pr = new Promise<void>((resolve, reject) => {
      connMan.engine.dispatchers = [
        withReject((message) => {
          expect(message.event.data?.title).toBe('outbound.event2');
          expect(message.to).toContain('outbound.event2.recipient');
          connMan.engine.dispatchers = [
            withReject((message) => {
              expect(message.event.data?.title).toBe('outbound.event2a');
              expect(message.to).toContain('outbound.event2a.recipient');
              resolve();
            }, reject),
          ];
        }, reject),
      ];
    });
    connMan.eventQ.queue({ ...events.event2, thredId });
    return pr;
  });
  test('replay condition', async function () {
    // rebuild engine and use stored state
    await initEngine();
    const promise = new Promise<void>((resolve, reject) => {
      connMan.engine.dispatchers = [
        withReject((message) => {
          expect(message.event.data?.title).toBe('outbound.event3');
          expect(message.to).toContain('outbound.event3.recipient');
          connMan.engine.dispatchers = [
            withReject((message) => {
              expect(message.event.data?.title).toBe('outbound.event2');
              expect(message.to).toContain('outbound.event2.recipient');
              connMan.engine.dispatchers = [
                withReject((message) => {
                  expect(message.event.data?.title).toBe('outbound.event2a');
                  expect(message.to).toContain('outbound.event2a.recipient');
                  resolve();
                }, reject),
              ];
            }, reject),
          ];
        }, reject),
      ];
    });
    connMan.eventQ.queue({ ...events.event3, thredId });
    return promise;
  });
  */
