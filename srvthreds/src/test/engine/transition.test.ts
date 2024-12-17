import { PatternModel, Logger, LoggerLevel, Events } from '../../ts/thredlib/index.js';
import { events, EngineConnectionManager, withDispatcherPromise, withReject } from '../testUtils.js';

Logger.setLevel(LoggerLevel.INFO);

describe('transitions', function () {
  beforeAll(async () => {
    connMan = await EngineConnectionManager.newEngineInstance(patternModels);
    await connMan.purgeAll();
  });
  // test an event that does not match the pattern
  test('ignore unknown event', function () {
    //direct call so that we can synchronize result
    return connMan.engine.consider(events.noMatch).then(async () =>
      expect(await connMan.engine.numThreds).toBe(0)
    );
  });
  // match the first event and start the thred
  test('match first event', () => {
    const pr = withDispatcherPromise(connMan.engine.dispatchers, async (message) => {
      expect(await connMan.engine.numThreds).toBe(1);
      expect(message.event.data?.title).toBe('outbound.event0');
      expect(message.to).toContain('outbound.event0.recipient');
      thredId = message.event.thredId;
    });
    connMan.eventQ.queue(events.event0);
    return pr;
  });
  // should move to the next reaction when no transition name is specified
  test('no transition specified', () => {
    const pr = withDispatcherPromise(connMan.engine.dispatchers, (message) => {
      expect(message.event.data?.title).toBe('outbound.event1');
      expect(message.to).toContain('outbound.event1.recipient');
    });
    connMan.eventQ.queue({ ...events.event1, thredId });
    return pr;
  });
  // should move to the next reation with '$next' AND run the same event on the next reaction immediately
  test('$next with forward input', () => {
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
  // send an event to the thred that should NOT cause any state changes
  test('ignore unknown event', async () => {
    await connMan.engine.consider({ ...events.noMatch, thredId });
    expect(await connMan.engine.numThreds).toBe(1);
  });
  //  should move to the named transition
  test('named transition', () => {
    const pr = withDispatcherPromise(connMan.engine.dispatchers, (message) => {
      expect(message.event.data?.title).toBe('outbound.event4');
      expect(message.to).toContain('outbound.event4.recipient');
    });
    connMan.eventQ.queue({ ...events.event4, thredId });
    return pr;
  });
  // should move to the named reaction AND apply it's last event as input immediately
  test('replay transition', () => {
    const pr = new Promise<void>((resolve, reject) => {
      connMan.engine.dispatchers = [
        withReject((message) => {
            expect(message.event.data?.title).toBe('outbound.event3');
            expect(message.to).toContain('outbound.event3.recipient');
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
    connMan.eventQ.queue({ ...events.event3, thredId });
    return pr;
  });
  // alternative path has no specified transition so 'next' is implied
  test('conditional path', () => {
    const pr = withDispatcherPromise(connMan.engine.dispatchers, (message) => {
      expect(message.event.data?.title).toBe('outbound.event4a');
      expect(message.to).toContain('outbound.event4a.recipient');
    });
    connMan.eventQ.queue({ ...events.event4a, thredId });
    return pr;
  });
  // should terminate after matching
  test('terminate transition', async () => {
    const pr = withDispatcherPromise(connMan.engine.dispatchers, (message) => {
      expect(message.event.data?.title).toBe('outbound.event5');
      expect(message.to).toContain('outbound.event5.recipient');
    });
    await connMan.engine.consider({ ...events.event5, thredId }).then(async () => 
      expect(await connMan.engine.numThreds).toBe(0)
    );
    return pr;
  });
  // send an event to the thred
  test('thred already terminated', async function () {
    const pr = withDispatcherPromise(connMan.engine.dispatchers, (message) => {
      expect(Events.getError(message.event)).toBeDefined();
    });
    connMan.eventQ.queue({ ...events.noMatch, thredId });
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
    name: 'Transition Test',
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
          onTrue: { xpr: "$setLocal('event2', $event)" },
          transform: {
            eventDataTemplate: {
              title: 'outbound.event2a',
            },
          },
          publish: {
            to: ['outbound.event2a.recipient'],
          },
          transition: {
            name: 'event4reaction',
          },
        },
      },
      {
        name: 'event3reaction',
        condition: {
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
            name: 'event2areaction',
            input: 'local',
            localName: 'event2',
          },
        },
      },
      {
        name: 'event4reaction',
        condition: {
          type: 'or',
          operands: [
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
                name: 'event3reaction',
              },
            },
            {
              type: 'filter',
              xpr: "$event.type = 'inbound.event4a'",
              transform: {
                eventDataTemplate: {
                  title: 'outbound.event4a',
                },
              },
              publish: {
                to: ['outbound.event4a.recipient'],
              },
            },
          ],
        },
      },
      {
        name: 'event5reaction',
        condition: {
          type: 'filter',
          xpr: "$event.type = 'inbound.event5'",
          transform: {
            eventDataTemplate: {
              title: 'outbound.event5',
            },
          },
          publish: {
            to: ['outbound.event5.recipient'],
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
