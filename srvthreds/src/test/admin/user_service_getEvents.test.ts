import { Logger, LoggerLevel, systemEventTypes, Message, Events, SystemEvents } from '../../ts/thredlib/index.js';
import {
  EngineConnectionManager,
  events,
  withDispatcherPromise,
  delay,
  createDbFixtures,
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
    await createDbFixtures();
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

    /*
    test('should return empty array when no events exist for participant', async function () {
      // Try to get events for thredId3 which was created by adminTestSource, not userTestSource
      const getEventsEvent = SystemEvents.getGetUserEventsEvent(thredId3 as string, userTestSource);
      const pr = withDispatcherPromise(engineConnMan.engine.dispatchers, (message: Message) => {
        expect(message.event.type).toBe('org.wt.tell');
        expect(message.event.re).toBe(getEventsEvent.id);
        expect(Events.assertSingleValues(message.event).status).toBe(systemEventTypes.successfulStatus);
        
        const events = Events.valueNamed(message.event, 'events');
        expect(events).toBeDefined();
        expect(Array.isArray(events)).toBe(true);
        expect(events.length).toBe(0);
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

    test('should handle non-existent thredId', async function () {
      const nonExistentThredId = 'non-existent-thred-id';
      const getEventsEvent = SystemEvents.getGetUserEventsEvent(nonExistentThredId, userTestSource);
      
      const pr = withDispatcherPromise(engineConnMan.engine.dispatchers, (message: Message) => {
        expect(message.event.type).toBe('org.wt.tell');
        expect(message.event.re).toBe(getEventsEvent.id);
        expect(Events.assertSingleValues(message.event).status).toBe(systemEventTypes.successfulStatus);
        
        const events = Events.valueNamed(message.event, 'events');
        expect(events).toBeDefined();
        expect(Array.isArray(events)).toBe(true);
        expect(events.length).toBe(0); // Should return empty array for non-existent thread
      });
      engineConnMan.eventQ.queue(getEventsEvent);
      return pr;
    });

    test('should verify event data structure', async function () {
      const getEventsEvent = SystemEvents.getGetUserEventsEvent(thredId1 as string, userTestSource);
      const pr = withDispatcherPromise(engineConnMan.engine.dispatchers, (message: Message) => {
        const events = Events.valueNamed(message.event, 'events');
        expect(events.length).toBeGreaterThan(0);
        
        // Verify event record structure
        const firstEvent = events[0];
        expect(firstEvent).toHaveProperty('id');
        expect(firstEvent).toHaveProperty('thredId');
        expect(firstEvent).toHaveProperty('event');
        expect(firstEvent).toHaveProperty('timestamp');
        
        // Verify event structure
        expect(firstEvent.event).toHaveProperty('id');
        expect(firstEvent.event).toHaveProperty('type');
        expect(firstEvent.event).toHaveProperty('source');
        expect(firstEvent.event).toHaveProperty('data');
      });
      engineConnMan.eventQ.queue(getEventsEvent);
      return pr;
    });
  });

  describe('Pagination and filtering tests', () => {
    test('should handle events with specific event types', async function () {
      // Send a specific event type to thread 1
      const pr1 = withDispatcherPromise(engineConnMan.engine.dispatchers, async (message: Message) => {
        expect(message.event.data?.title).toBe('outbound.event2');
      });
      engineConnMan.eventQ.queue({ ...events.event2, thredId: thredId1, source: userTestSource });
      await pr1;
      
      await delay(500);
      
      const getEventsEvent = SystemEvents.getGetUserEventsEvent(thredId1 as string, userTestSource);
      const pr2 = withDispatcherPromise(engineConnMan.engine.dispatchers, (message: Message) => {
        const events = Events.valueNamed(message.event, 'events');
        
        // Should now have events of multiple types
        const eventTypes = events.map((er: EventRecord) => er.event.type);
        expect(eventTypes).toContain('inbound.event0');
        expect(eventTypes).toContain('inbound.event1');
        expect(eventTypes).toContain('inbound.event2');
      });
      engineConnMan.eventQ.queue(getEventsEvent);
      return pr2;
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

  describe('Edge cases and error scenarios', () => {
    test('should handle terminated thread events', async function () {
      // Terminate thread 1
      const terminateEvent = SystemEvents.getTerminateThredEvent(thredId1 as string, adminTestSource);
      const pr1 = withDispatcherPromise(engineConnMan.engine.dispatchers, (message: Message) => {
        expect(Events.assertSingleValues(message.event).status).toBe(systemEventTypes.successfulStatus);
      });
      engineConnMan.eventQ.queue(terminateEvent);
      await pr1;
      
      await delay(500);
      
      // Try to get events for terminated thread
      const getEventsEvent = SystemEvents.getGetUserEventsEvent(thredId1 as string, userTestSource);
      const pr2 = withDispatcherPromise(engineConnMan.engine.dispatchers, (message: Message) => {
        expect(message.event.type).toBe('org.wt.tell');
        expect(Events.assertSingleValues(message.event).status).toBe(systemEventTypes.successfulStatus);
        
        const events = Events.valueNamed(message.event, 'events');
        // Should still return events even for terminated thread
        expect(events).toBeDefined();
        expect(Array.isArray(events)).toBe(true);
      });
      engineConnMan.eventQ.queue(getEventsEvent);
      return pr2;
    });

    test('should handle concurrent event retrieval', async function () {
      // Send multiple getEvents requests concurrently
      const promises = [];
      
      for (let i = 0; i < 3; i++) {
        const getEventsEvent = SystemEvents.getGetUserEventsEvent(thredId2 as string, userTestSource);
        const pr = withDispatcherPromise(engineConnMan.engine.dispatchers, (message: Message) => {
          expect(Events.assertSingleValues(message.event).status).toBe(systemEventTypes.successfulStatus);
          const events = Events.valueNamed(message.event, 'events');
          expect(events).toBeDefined();
          expect(Array.isArray(events)).toBe(true);
        });
        engineConnMan.eventQ.queue(getEventsEvent);
        promises.push(pr);
      }
      
      await Promise.all(promises);
    });

    test('should handle events with large data payloads', async function () {
      // Create event with large data payload
      const largeDataEvent: Event = {
        id: 'large-data-event',
        type: 'inbound.event1',
        thredId: thredId2,
        source: userTestSource,
        data: {
          title: 'Large Data Event',
          content: {
            values: {
              largeArray: new Array(100).fill('test-data'),
              nestedObject: {
                level1: {
                  level2: {
                    level3: {
                      data: 'deeply nested data'
                    }
                  }
                }
              }
            }
          }
        }
      };
      
      const pr1 = withDispatcherPromise(engineConnMan.engine.dispatchers, async (message: Message) => {
        expect(message.event.data?.title).toBe('outbound.event1');
      });
      engineConnMan.eventQ.queue(largeDataEvent);
      await pr1;
      
      await delay(500);
      
      // Retrieve events including the large data event
      const getEventsEvent = SystemEvents.getGetUserEventsEvent(thredId2 as string, userTestSource);
      const pr2 = withDispatcherPromise(engineConnMan.engine.dispatchers, (message: Message) => {
        const events = Events.valueNamed(message.event, 'events');
        
        // Find the large data event
        const largeEvent = events.find((er: EventRecord) => er.event.id === 'large-data-event');
        expect(largeEvent).toBeDefined();
        expect(largeEvent.event.data?.content?.values?.largeArray).toHaveLength(100);
        expect(largeEvent.event.data?.content?.values?.nestedObject?.level1?.level2?.level3?.data).toBe('deeply nested data');
      });
      engineConnMan.eventQ.queue(getEventsEvent);
      return pr2;
    });
    */
  });

  afterAll(async () => {
    await engineConnMan.purgeAll();
    await engineConnMan.disconnectAll();
  });
});
