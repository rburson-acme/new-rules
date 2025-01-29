import { aw } from 'vitest/dist/chunks/reporters.WnPwkmgA.js';
import { PatternModel, Logger, LoggerLevel } from '../../ts/thredlib/index.js';
import { events, EngineConnectionManager, withReject, withDispatcherPromise, delay } from '../testUtils.js';

Logger.setLevel(LoggerLevel.INFO);

describe('expiry tests', function () {
  beforeAll(async () => {
    connMan = await EngineConnectionManager.newEngineInstance(patternModels);
    await connMan.purgeAll();
  });
  // match the first event and start the thred
  test('match first event', function () {
    const pr = withDispatcherPromise(connMan.engine.dispatchers,
      async (message) => {
        expect(await connMan.engine.numThreds).toBe(1);
        expect(message.event.data?.title).toBe('outbound.event0');
        expect(message.to).toContain('outbound.event0.recipient');
        thredId = message.event.thredId;
      },
    );
    connMan.eventQ.queue(events.event0);
    return pr;
  });
  // should move to the next reaction when no transition name is specified
  test('no transition specified', function () {
    const pr = withDispatcherPromise(connMan.engine.dispatchers,
      (message) => {
        expect(message.event.data?.title).toBe('outbound.event1');
        expect(message.to).toContain('outbound.event1.recipient');
      },
    );
    connMan.eventQ.queue({ ...events.event1, thredId });
    return pr;
  });
  test('should expire and ignore expired condition', async function () {
    await delay(2100);
    connMan.eventQ.queue({ ...events.event1a, thredId });
    return;
  });
  test('should still be expired and move back to specified transition', async function () {
    const pr = withDispatcherPromise(connMan.engine.dispatchers,
      (message) => {
        expect(message.event.data?.title).toBe('outbound.event1');
        expect(message.to).toContain('outbound.event1.recipient');
      },
    );
    connMan.eventQ.queue({ ...events.event1, thredId });
    return pr;
  });
  test('should have moved to next transition which is not yet expired', async function () {
    const pr = withDispatcherPromise(connMan.engine.dispatchers,
      (message) => {
        expect(message.event.data?.title).toBe('outbound.event1a');
        expect(message.to).toContain('outbound.event1a.recipient');
      },
    );
    connMan.eventQ.queue({ ...events.event1a, thredId });
    return pr;
  });
  // should move to the next reation with '$next' AND run the same event on the next reaction immediately
  test('$next with forward input', function () {
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
  test('ignore unknown event', async function () {
    await connMan.eventQ.queue({ ...events.noMatch, thredId });
    expect(await connMan.engine.numThreds).toBe(1);
  });
  //  after wait, should be timed out, ignore the current condition and move to previous reaction and replay input
  // current condition is ignored, but the event is necessary to force the expiration of the current reaction
  test('timed transition', async function () {
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
    await delay(2100);
    await connMan.eventQ.queue({ ...events.event3, thredId });
    return pr;
  });
  // should have moved back to the reaction with the timeout (event3reaction)
  // should move to the named transition and receive event BEFORE timing out
  test('timed transition', async function () {
    const pr = withDispatcherPromise(connMan.engine.dispatchers,
      (message) => {
        expect(message.event.data?.title).toBe('outbound.event3');
        expect(message.to).toContain('outbound.event3.recipient');
      },
    );
    await connMan.eventQ.queue({ ...events.event3, thredId });
    return pr;
  });
  //  should move to the named transition and expire
  test('finished', async function () {
    await delay(1000);
    expect(await connMan.engine.numThreds).toBe(0);
  });
  // cleanup in case of failure
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
    name: 'Expire Test',
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
        name: "event1reaction",
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
        name: 'event1areaction',
        condition: {
          type: 'filter',
          xpr: "$event.type = 'inbound.event1a'",
          transform: {
            eventDataTemplate: {
              title: 'outbound.event1a',
            },
          },
          publish: {
            to: ['outbound.event1a.recipient'],
          },
        },
        expiry: {
          interval: 2000,
          transition: {
            name: 'event1reaction',
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
            name: '$terminate',
          },
        },
        expiry: {
          interval: 2000,
          transition: {
            name: 'event2reaction',
            input: 'local',
            localName: 'event2',
          },
        },
      },
    ],
  },
];

let connMan: EngineConnectionManager;
