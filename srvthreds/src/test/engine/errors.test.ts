import {
  BuiltInEvents,
  errorCodes,
  errorKeys,
  Events,
  EventThrowable,
  eventTypes,
  Id,
  Logger,
  LoggerLevel,
  PatternModel,
  serializableError,
} from '../../ts/thredlib/index.js';

import { delay, EngineConnectionManager, events, withDispatcherPromise, withReject } from '../testUtils.js';

Logger.setLevel(LoggerLevel.DEBUG);

// This test emulates the correct behavior of agent when catching, constructing and sending error events to the engine
describe('errors tests', function () {
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
    connMan.eventQ.queue({ ...events.event0, source: { id: 'participant0' } });
    return pr;
  });
  test('add 1 more participant', function () {
    const pr = withDispatcherPromise(connMan.engine.dispatchers, async (message) => {
      expect(message.event.data?.title).toBe('outbound.event1');
      expect(message.to).toContain('participant3');
    });
    connMan.eventQ.queue({ ...events.event1, thredId, source: { id: 'participant1' } });
    return pr;
  });
  // This test emulates the correct behavior of agent when catching, constructing and sending error events to the engine
  test('send an error message (e.g. from persistence agent)', function () {
    const pr = withDispatcherPromise(connMan.engine.dispatchers, async (message) => {
      expect(Events.getError(message.event)).toBeDefined();
      expect(Events.getError(message.event)?.cause.message).toBe('Persistence connection closed');  
      expect(message.to).toContain('participant0');
      expect(message.to).toContain('participant1');
      expect(message.to).toContain('participant2');
      expect(message.to).toContain('participant3');
    });
    // create an EventThrowable
    const eventThrowable = EventThrowable.get({
      message: `PersistenceAgent: Error processing message ${events.event2}`,
      code: errorCodes[errorKeys.TASK_ERROR].code,
      cause: new Error('Persistence connection closed'),
    });
    // serialize the error
    const cause = serializableError(eventThrowable.eventError?.cause);
    // create an error event
    const event = getErrorEvent({ ...eventThrowable.eventError, cause } as EventThrowable['eventError']);
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

const getErrorEvent = (error: EventThrowable['eventError']) => {
  return Events.newEvent({
    id: Id.getNextId('persistence1'),
    type: 'persistence',
    re: events.event2.id,
    data: {
      title: `persistence1 Result`,
      content: { error },
    },
    source: { id: 'persistence', name: 'Persistence Agent' },
    thredId: thredId,
  });
};

let thredId: string | undefined;

const patternModels: PatternModel[] = [
  {
    name: 'Errors Test',
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
          // don't terminate the thred because we need it to remain active to test the error
          transition: {
            name: 'event1reaction',
          },
        },
      },
    ],
  },
];

let connMan: EngineConnectionManager;
