import { BuiltInEvents, Events, eventTypes, Logger, LoggerLevel, PatternModel } from '../../ts/thredlib/index.js';

import { delay, EngineConnectionManager, events, withDispatcherPromise, withReject } from '../testUtils.js';

Logger.setLevel(LoggerLevel.DEBUG);

describe('builtins tests', function () {
  beforeAll(async () => {
    connMan = await EngineConnectionManager.newEngineInstance(patternModels);
    await connMan.purgeAll();
  });
  test('start a thred that adds 2 participants', function () {
    const pr = withDispatcherPromise(connMan.engine.dispatchers, async (message) => {
      expect(await connMan.engine.numThreds).toBe(1);
      expect(message.event.data?.title).toBe('outbound.event0');
      expect(message.to).toContain('participant1');
      expect(message.to).toContain('participant2');
      thredId = message.event.thredId;
    });
    connMan.eventQ.queue({...events.event0, source: { id: 'participant0' }});
    return pr;
  });
  test('add 1 more participant', function () {
    const pr = withDispatcherPromise(connMan.engine.dispatchers, async (message) => {
      expect(message.event.data?.title).toBe('outbound.event1');
      expect(message.to).toContain('participant3');
    });
    connMan.eventQ.queue({...events.event1, thredId, source: { id: 'participant1' }});
    return pr;
  });
  test('send a broadcast message', function () {
    const pr = withDispatcherPromise(connMan.engine.dispatchers, async (message) => {
      expect(message.event.source.id).toBe(eventTypes.system.source.id);
      expect(Events.valueNamed(message.event, 'message')).toBe('Hello');
      expect(Events.valueNamed(message.event, 'messageSource').id).toBe('participant1');
      expect(message.to).toContain('participant0');
      expect(message.to).toContain('participant2');
      expect(message.to).toContain('participant3');
      expect(message.to).not.toContain('participant1');
    });
    const event = BuiltInEvents.getBroadcastMessageEvent(thredId!, { id: 'participant1' }, 'Hello');
    expect(Events.valueNamed(event, 'message')).toBe('Hello');
    connMan.eventQ.queue(event);
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
    name: 'Builtins Test',
    instanceInterval: 0,
    maxInstances: 0,
    broadcastAllowed: true,
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
            to: ['participant1', 'participant2'],
          },
        },
      },
      {
        name: 'event1reaction',
        condition: {
          type: 'filter',
          xpr: "$event.type = 'inbound.event1'",
          transform: {
            eventDataTemplate: {
              title: 'outbound.event1',
            },
          },
          publish: {
            to: ['participant3'],
          },
          // don't terminate the thred because we need it to remain active in order to broadcast
          transition: {
            name: '$noTransition',
          }
        },
      },
    ],
  },
];

let connMan: EngineConnectionManager;
