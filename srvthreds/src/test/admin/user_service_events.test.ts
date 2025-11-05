import {
  Logger,
  LoggerLevel,
  systemEventTypes,
  Message,
  Events,
  SystemEvents,
  errorCodes,
  errorKeys,
} from '../../ts/thredlib/index.js';
import {
  EngineConnectionManager,
  events,
  withDispatcherPromise,
  delay,
  createUserDbFixtures,
  eventWith,
} from '../testUtils.js';
import { adminTestPatternModels, adminTestSource, userTestPatternModels, userTestSource } from './adminTestUtils.js';
import { EventRecord } from '../../ts/thredlib/persistence/EventRecord.js';

Logger.setLevel(LoggerLevel.ERROR);

describe('UserService getEvents method test', function () {
  let engineConnMan: EngineConnectionManager;
  let thredId1: string | undefined;
  let thredId2: string | undefined;
  let thredId3: string | undefined;
  let eventId = 0;

  beforeAll(async () => {
    engineConnMan = await EngineConnectionManager.newEngineInstance(userTestPatternModels);
    await engineConnMan.purgeAll();
    await createUserDbFixtures();
  });

  describe('Setup test data', () => {
    test('should create multiple threads with various events', async function () {
      // Create first thread
      const pr1 = withDispatcherPromise(engineConnMan.engine.dispatchers, async (message: Message) => {
        expect(await engineConnMan.engine.numThreds).toBe(1);
        expect(message.event.data?.title).toBe('outbound.event0');
        thredId1 = message.event.thredId;
      });
      engineConnMan.eventQ.queue(eventWith(events.event0, { source: userTestSource, id: `event${eventId++}` }));
      await pr1;

      // Send additional events to first thread
      const pr2 = withDispatcherPromise(engineConnMan.engine.dispatchers, async (message: Message) => {
        expect(message.event.data?.title).toBe('outbound.event1');
        expect(message.event.thredId).toBe(thredId1);
      });
      engineConnMan.eventQ.queue(
        eventWith(events.event1, { thredId: thredId1, source: userTestSource, id: `event${eventId++}` }),
      );
      await pr2;

      // Create second thread
      const pr3 = withDispatcherPromise(engineConnMan.engine.dispatchers, async (message: Message) => {
        expect(await engineConnMan.engine.numThreds).toBe(2);
        expect(message.event.data?.title).toBe('outbound.event0');
        thredId2 = message.event.thredId;
      });
      engineConnMan.eventQ.queue(eventWith(events.event0, { source: userTestSource, id: `event${eventId++}` }));
      await pr3;

      // Send multiple events to second thread
      const pr4 = withDispatcherPromise(engineConnMan.engine.dispatchers, async (message: Message) => {
        expect(message.event.data?.title).toBe('outbound.event1');
        expect(message.event.thredId).toBe(thredId2);
      });
      engineConnMan.eventQ.queue(
        eventWith(events.event1, { thredId: thredId2, source: userTestSource, id: `event${eventId++}` }),
      );
      await pr4;

      const pr5 = withDispatcherPromise(engineConnMan.engine.dispatchers, async (message: Message) => {
        expect(message.event.data?.title).toBe('outbound.event2');
        expect(message.event.thredId).toBe(thredId2);
      });
      engineConnMan.eventQ.queue(
        eventWith(events.event2, { thredId: thredId2, source: userTestSource, id: `event${eventId++}` }),
      );
      await pr5;

      // Create third thread with different source
      const pr6 = withDispatcherPromise(engineConnMan.engine.dispatchers, async (message: Message) => {
        expect(await engineConnMan.engine.numThreds).toBe(3);
        thredId3 = message.event.thredId;
      });
      engineConnMan.eventQ.queue(eventWith(events.event0, { source: adminTestSource, id: `event${eventId++}` }));
      await pr6;

      // Allow time for events to be persisted
      await delay(1000);
    });
  });

  describe('getEvents method tests', () => {
    test('should retrieve events for a specific thread and participant', async function () {
      const getEventsEvent = SystemEvents.getGetUserEventsEvent(thredId1 as string, userTestSource);
      const pr = withDispatcherPromise(engineConnMan.engine.dispatchers, (message: Message) => {
        expect(message.event.type).toBe('org.wt.tell');
        expect(message.event.re).toBe(getEventsEvent.id);
        expect(Events.assertSingleValues(message.event).status).toBe(systemEventTypes.successfulStatus);
        expect(Events.assertSingleValues(message.event).op).toBe(systemEventTypes.operations.user.getEvents);

        const events = Events.valueNamed(message.event, 'events');
        expect(events).toBeDefined();
        expect(Array.isArray(events)).toBe(true);
        expect(events.length).toBeGreaterThan(0);

        // Verify events belong to the correct thread
        events.forEach((eventRecord: EventRecord) => {
          expect(eventRecord.thredId).toBe(thredId1);
        });
      });
      engineConnMan.eventQ.queue(getEventsEvent);
      return pr;
    });

    test('should retrieve multiple events for a thread with multiple events', async function () {
      const getEventsEvent = SystemEvents.getGetUserEventsEvent(thredId2 as string, userTestSource);
      const pr = withDispatcherPromise(engineConnMan.engine.dispatchers, (message: Message) => {
        expect(message.event.type).toBe('org.wt.tell');
        expect(message.event.re).toBe(getEventsEvent.id);
        expect(Events.assertSingleValues(message.event).status).toBe(systemEventTypes.successfulStatus);

        const events = Events.valueNamed(message.event, 'events');
        expect(events).toBeDefined();
        expect(Array.isArray(events)).toBe(true);
        expect(events.length).toBeGreaterThanOrEqual(3); // At least event0, event1, and event2

        // Verify event types
        const eventTypes = events.map((er: EventRecord) => er.event.type);
        expect(eventTypes).toContain('inbound.event0');
        expect(eventTypes).toContain('inbound.event1');
        expect(eventTypes).toContain('inbound.event2');
      });
      engineConnMan.eventQ.queue(getEventsEvent);
      return pr;
    });

    test('should retrieve one outbound event for thredId3 for userTestSource', async function () {
      // Try to get events for thredId3 which was created by adminTestSource, not userTestSource
      const getEventsEvent = SystemEvents.getGetUserEventsEvent(thredId3 as string, userTestSource);
      const pr = withDispatcherPromise(engineConnMan.engine.dispatchers, (message: Message) => {
        expect(message.event.type).toBe('org.wt.tell');
        expect(message.event.re).toBe(getEventsEvent.id);
        expect(Events.assertSingleValues(message.event).status).toBe(systemEventTypes.successfulStatus);

        const events = Events.valueNamed(message.event, 'events');
        expect(events).toBeDefined();
        expect(Array.isArray(events)).toBe(true);
        expect(events.length).toBe(1);
      });
      engineConnMan.eventQ.queue(getEventsEvent);
      return pr;
    });

    test('should handle missing thredId parameter', async function () {
      // Create event without thredId
      const getEventsEvent = SystemEvents.getGetUserEventsEvent('', userTestSource);
      // Remove the thredId from values to simulate missing parameter
      delete (getEventsEvent.data?.content?.values as any).thredId;

      const pr = withDispatcherPromise(engineConnMan.engine.dispatchers, (message: Message) => {
        expect(message.event.type).toBe('org.wt.tell');
        expect(message.event.re).toBe(getEventsEvent.id);

        const error = Events.getError(message.event);
        expect(error).toBeDefined();
        expect(error?.code).toBe(errorCodes[errorKeys.MISSING_ARGUMENT_ERROR].code);
        expect(error?.message).toContain('No thredId supplied');
      });
      engineConnMan.eventQ.queue(getEventsEvent);
      return pr;
    });

    test('should retrieve events in chronological order', async function () {
      const getEventsEvent = SystemEvents.getGetUserEventsEvent(thredId2 as string, userTestSource);
      const pr = withDispatcherPromise(engineConnMan.engine.dispatchers, (message: Message) => {
        const events = Events.valueNamed(message.event, 'events');

        // Verify events are in chronological order (oldest first)
        for (let i = 1; i < events.length; i++) {
          const prevTimestamp = events[i - 1].timestamp;
          const currTimestamp = events[i].timestamp;
          expect(currTimestamp).toBeGreaterThanOrEqual(prevTimestamp);
        }
      });
      engineConnMan.eventQ.queue(getEventsEvent);
      return pr;
    });
  });

  afterAll(async () => {
    await engineConnMan.purgeAll();
    await engineConnMan.disconnectAll();
  });
});
