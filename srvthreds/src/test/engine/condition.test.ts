import { PatternModel, Logger, LoggerLevel } from '../../ts/thredlib/index.js';
import { events, EngineConnectionManager, withDispatcherPromise } from '../testUtils.js';

Logger.setLevel(LoggerLevel.INFO);

describe('conditions', function () {
  beforeAll(async () => {
    connMan = await EngineConnectionManager.newEngineInstance(patternModels);
    await connMan.purgeAll();
  });
  // match the first event and start the thred
  test('match filter', function () {
    const pr = withDispatcherPromise(connMan.engine.dispatchers,
      (message) => {
        expect(connMan.engine.numThreds).toBe(1);
        expect(message.event.data?.title).toBe('outbound.event0');
        expect(message.to).toContain('outbound.event0.recipient');
        thredId = message.event.thredId;
      },
    );
    connMan.eventQ.queue(events.event0);
    return pr;
  });
  // should match both AND conditions and return the 'and condition' level result
  test('and condition', function () {
    const pr = withDispatcherPromise(connMan.engine.dispatchers,
      (message) => {
        expect(message.event.data?.title).toBe('outbound.event1');
        expect(message.event.data?.description).toBe(
          'response to event 1 and event 1a'
        );
        expect(message.to).toContain('outbound.event1.recipient');
      },
    );
    connMan.eventQ.queue({ ...events.event1, thredId });
    connMan.eventQ.queue({ ...events.event1a, thredId });
    return pr;
  });
  // should match the first OR condition and return the first condition level result
  test('match first or condition', function () {
    const pr = withDispatcherPromise(connMan.engine.dispatchers,
      (message) => {
        expect(message.event.data?.title).toBe('outbound.event2');
        expect(message.to).toContain('outbound.event2.recipient');
      },
    );
    connMan.eventQ.queue({ ...events.event2, thredId });
    return pr;
  });
  // should match the second OR condition and return the second condition-level result
  test('match second or condition', function () {
    const pr = withDispatcherPromise(connMan.engine.dispatchers,
      (message) => {
        expect(message.event.data?.title).toBe('outbound.event2a');
        expect(message.to).toContain('outbound.event2a.recipient');
      },
    );
    connMan.eventQ.queue({ ...events.event2a, thredId });
    return pr;
  });


  // These are placeholders for more sophisticated tests in the future

  // should return the first condition level result
  test('match first or condition', function () {
    const pr = withDispatcherPromise(connMan.engine.dispatchers,
      (message) => {
        expect(message.event.data?.title).toBe('outbound.event3');
        expect(message.to).toContain('outbound.event3.recipient');
      },
    );
    connMan.eventQ.queue({ ...events.event3, thredId });
    return pr;
  });
  // should return the shared 'or condition' level result
  test('match second or condition', function () {
    const pr = withDispatcherPromise(connMan.engine.dispatchers,
      (message) => {
        expect(message.event.data?.title).toBe('outbound.event3a');
        expect(message.to).toContain('outbound.event3a.recipient');
      },
    );
    connMan.eventQ.queue({ ...events.event3a, thredId });
    return pr;
  });
  // should return the shared 'or condition' level result
  test('match first or condition', function () {
    const pr = withDispatcherPromise(connMan.engine.dispatchers,
      (message) => {
        expect(message.event.data?.title).toBe('outbound.event4x');
        expect(message.to).toContain('outbound.event4x.recipient');
      },
    );
    connMan.eventQ.queue({ ...events.event4, thredId });
    return pr;
  });
  // should return the shared 'or condition' level result
  test('match second or condition', function () {
    const pr = withDispatcherPromise(connMan.engine.dispatchers,
      (message) => {
        expect(message.event.data?.title).toBe('outbound.event4x');
        expect(message.to).toContain('outbound.event4x.recipient');
      },
    );
    connMan.eventQ.queue({ ...events.event4a, thredId });
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

let connMan: EngineConnectionManager;

const patternModels: PatternModel[] = [
  {
    name: 'Conditions Test',
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
          type: 'and',
          operands: [
            {
              type: 'filter',
              xpr: "$event.type = 'inbound.event1'",
              onTrue: {
                xpr: "$setLocal('event1', $event)",
              },
            },
            {
              type: 'filter',
              xpr: "$event.type = 'inbound.event1a'",
              onTrue: {
                xpr: "$setLocal('event2', $event)",
              },
            },
          ],
          transform: {
            eventDataTemplate: {
              title: 'outbound.event1',
              description:
                "$xpr( 'response to event ' & $local('event1').id & ' and event ' & $local('event2').id )",
            },
          },
          publish: {
            to: ['outbound.event1.recipient'],
          },
        },
      },
      // The first condition here will transition to this same reaction (itself) when matched
      // The second condition will transition to the next reaction when matched
      {
        name: 'orConditionReaction',
        condition: {
          type: 'or',
          operands: [
            {
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
                name: 'orConditionReaction',
              },
            },
            {
              type: 'filter',
              xpr: "$event.type = 'inbound.event2a'",
              transform: {
                eventDataTemplate: {
                  title: 'outbound.event2a',
                },
              },
              publish: {
                to: ['outbound.event2a.recipient'],
              },
            },
          ],
        },
      },
      {
        name: 'orConditionReaction2',
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
                name: 'orConditionReaction2',
              },
            },
            {
              type: 'filter',
              xpr: "$event.type = 'inbound.event3a'",
            },
          ],
          transform: {
            eventDataTemplate: {
              title: 'outbound.event3a',
            },
          },
          publish: {
            to: ['outbound.event3a.recipient'],
          },
        },
      },
      {
        name: 'orConditionReaction3',
        condition: {
          type: 'or',
          operands: [
            {
              type: 'filter',
              xpr: "$event.type = 'inbound.event4'",
              transition: {
                name: 'orConditionReaction3',
              },
            },
            {
              type: 'filter',
              xpr: "$event.type = 'inbound.event4a'",
            },
          ],
          transform: {
            eventDataTemplate: {
              title: 'outbound.event4x',
            },
          },
          publish: {
            to: ['outbound.event4x.recipient'],
          },
        },
      },
    ],
  },
];
