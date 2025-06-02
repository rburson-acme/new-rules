import {
  Logger,
  LoggerLevel,
  systemEventTypes,
  PatternModel,
  Message,
  Events,
  SystemEvents,
} from '../../ts/thredlib/index.js';
import { EngineConnectionManager, events, withDispatcherPromise, withReject } from '../testUtils.js';
import { PersistenceFactory } from '../../ts/persistence/PersistenceFactory.js';
import { adminTestPatternModels, adminTestSource } from './adminTestUtils.js';

Logger.setLevel(LoggerLevel.ERROR);

describe('admin functions system test', function () {
  beforeAll(async () => {
    engineConnMan = await EngineConnectionManager.newEngineInstance(adminTestPatternModels);
    await engineConnMan.purgeAll();
  });
  test('should start a new thred', function () {
    const pr = withDispatcherPromise(engineConnMan.engine.dispatchers, async (message: Message) => {
      expect(await engineConnMan.engine.numThreds).toBe(1);
      expect(message.event.data?.title).toBe('outbound.event0');
      expect(message.event.re).toBe('0');
      expect(message.to).toContain('outbound.event0.recipient');
      thredId0 = message.event.thredId;
    });
    engineConnMan.eventQ.queue(events.event0);
    return pr;
  });
  test('terminate Thred', async function () {
    const terminateThredEvent = SystemEvents.getTerminateThredEvent(thredId0 as string, adminTestSource);
    const pr = withDispatcherPromise(engineConnMan.engine.dispatchers, (message: Message) => {
      expect(message.event.type).toBe('org.wt.tell');
      expect(message.event.re).toBe(terminateThredEvent.id);
      expect(Events.assertSingleValues(message.event).status).toBe(systemEventTypes.successfulStatus);
      expect(Events.assertSingleValues(message.event).op).toBe(systemEventTypes.operations.terminateThred);
    });
    engineConnMan.eventQ.queue(terminateThredEvent);
    return pr;
  });
  test('thred should no longer be available', function () {
    const pr = withDispatcherPromise(engineConnMan.engine.dispatchers, async (message: Message) => {
      const { event, to } = message;
      expect(await engineConnMan.engine.numThreds).toBe(0);
      expect(to).toContain('test.dataset');
      expect(event.re).toBe(events.event1.id);
      expect(Events.getError(event)).toBeDefined();
    });
    engineConnMan.eventQ.queue({ ...events.event1, thredId: thredId0 });
    return pr;
  });
  test('should start a new thred', function () {
    const pr = withDispatcherPromise(engineConnMan.engine.dispatchers, async (message: Message) => {
      expect(await engineConnMan.engine.numThreds).toBe(1);
      expect(message.event.data?.title).toBe('outbound.event0');
      expect(message.event.re).toBe('0');
      expect(message.to).toContain('outbound.event0.recipient');
      thredId1 = message.event.thredId;
    });
    engineConnMan.eventQ.queue(events.event0);
    return pr;
  });
  // move the thred to event2Reaction
  test('transition Thred', async function () {
    const transitionThredEvent = SystemEvents.getTransitionThredEvent(
      thredId1 as string,
      { name: 'event2Reaction' },
      adminTestSource,
    );
    const pr = withDispatcherPromise(engineConnMan.engine.dispatchers, (message: Message) => {
      expect(message.event.type).toBe('org.wt.tell');
      expect(message.event.re).toBe(transitionThredEvent.id);
      expect(Events.assertSingleValues(message.event).status).toBe(systemEventTypes.successfulStatus);
      expect(Events.assertSingleValues(message.event).op).toBe(systemEventTypes.operations.transitionThred);
    });
    engineConnMan.eventQ.queue(transitionThredEvent);
    return pr;
  });
  // should be in event2Reaction
  test('thred should have moved to new reaction', async function () {
    const pr = withDispatcherPromise(engineConnMan.engine.dispatchers, async (message: Message) => {
      const { event, to } = message;
      expect(await engineConnMan.engine.numThreds).toBe(1);
      expect(to).toContain('outbound.event2.recipient');
    });
    engineConnMan.eventQ.queue({ ...events.event2, thredId: thredId1 });
    return pr;
  });
  // move the thred to event0Reaction and replay local event0 (set in event0Reaction)
  test('transition Thred', async function () {
    const transitionThredEvent = SystemEvents.getTransitionThredEvent(
      thredId1 as string,
      { name: 'event0Reaction', input: 'local', localName: 'event0' },
      adminTestSource,
    );
    // first dispatched should be the event0Reaction's output
    const pr = new Promise<void>((resolve, reject) => {
      engineConnMan.engine.dispatchers = [
        withReject(async (message) => {
          expect(await engineConnMan.engine.numThreds).toBe(1);
          expect(message.event.data?.title).toBe('outbound.event0');
          expect(message.event.re).toBe('0');
          expect(message.to).toContain('outbound.event0.recipient');
          // second should be the admin response event
          engineConnMan.engine.dispatchers = [
            withReject((message) => {
              expect(message.event.type).toBe('org.wt.tell');
              expect(message.event.re).toBe(transitionThredEvent.id);
              expect(Events.assertSingleValues(message.event).status).toBe(systemEventTypes.successfulStatus);
              expect(Events.assertSingleValues(message.event).op).toBe(systemEventTypes.operations.transitionThred);
              resolve();
            }, reject),
          ];
        }, reject),
      ];
    });
    engineConnMan.eventQ.queue(transitionThredEvent);
    return pr;
  });
  test('thred should have moved to new reaction', async function () {
    const pr = withDispatcherPromise(engineConnMan.engine.dispatchers, async (message: Message) => {
      const { event, to } = message;
      expect(await engineConnMan.engine.numThreds).toBe(1);
      expect(to).toContain('outbound.event1.recipient');
    });
    engineConnMan.eventQ.queue({ ...events.event1, thredId: thredId1 });
    return pr;
  });
  test('should start an additional Thred', function () {
    const pr = withDispatcherPromise(engineConnMan.engine.dispatchers, async (message: Message) => {
      expect(await engineConnMan.engine.numThreds).toBe(2);
      expect(message.event.data?.title).toBe('outbound.event0');
      expect(message.event.re).toBe('0');
      expect(message.to).toContain('outbound.event0.recipient');
      thredId2 = message.event.thredId;
    });
    engineConnMan.eventQ.queue(events.event0);
    return pr;
  });
  test('get All Active Threds', async function () {
    const getThredsEvent = SystemEvents.getGetThredsEvent(adminTestSource);
    const pr = withDispatcherPromise(engineConnMan.engine.dispatchers, (message: Message) => {

      expect(message.event.type).toBe('org.wt.tell');
      expect(message.event.re).toBe(getThredsEvent.id);
      expect(Events.assertSingleValues(message.event).status).toBe(systemEventTypes.successfulStatus);
      expect(Events.assertSingleValues(message.event).op).toBe(systemEventTypes.operations.getThreds);
      const threds = Events.valueNamed(message.event, 'threds');
      expect(threds).length(2);
      expect(threds.map((thred: { id: any; }) => thred.id)).toContain(thredId1);
      expect(threds.map((thred: { id: any; }) => thred.id)).toContain(thredId2);
      expect(threds.map((thred: { currentReaction: { reactionName: string}; }) => thred.currentReaction.reactionName)).toContain('event2Reaction');
      expect(threds.map((thred: { currentReaction: { reactionName: string}; }) => thred.currentReaction.reactionName)).toContain('event1Reaction');
    });
    engineConnMan.eventQ.queue(getThredsEvent);
    return pr;
  });
  test('get All Terminated Threds', async function () {
    const lastHour = new Date().getTime() - (60 * 60 * 1000);
    const getThredsEvent = SystemEvents.getGetThredsEvent(adminTestSource, 'terminated', { "thred.endTime": { $gte: lastHour } });
    const pr = withDispatcherPromise(engineConnMan.engine.dispatchers, (message: Message) => {
      expect(message.event.type).toBe('org.wt.tell');
      expect(message.event.re).toBe(getThredsEvent.id);
      expect(Events.assertSingleValues(message.event).status).toBe(systemEventTypes.successfulStatus);
      expect(Events.assertSingleValues(message.event).op).toBe(systemEventTypes.operations.getThreds);
      const threds = Events.valueNamed(message.event, 'threds');
      expect(threds).length(1);
      expect(threds[0].id).toBe(thredId0);
    });
    engineConnMan.eventQ.queue(getThredsEvent);
    return pr;
  });
  test('get All Threds', async function () {
    const getThredsEvent = SystemEvents.getGetThredsEvent(adminTestSource, 'all', {});
    const pr = withDispatcherPromise(engineConnMan.engine.dispatchers, (message: Message) => {
      expect(message.event.type).toBe('org.wt.tell');
      expect(message.event.re).toBe(getThredsEvent.id);
      expect(Events.assertSingleValues(message.event).status).toBe(systemEventTypes.successfulStatus);
      expect(Events.assertSingleValues(message.event).op).toBe(systemEventTypes.operations.getThreds);
      const threds = Events.valueNamed(message.event, 'threds');
      expect(threds).length(3);
      expect(threds.map((thred: { id: any; }) => thred.id)).toContain(thredId0);
      expect(threds.map((thred: { id: any; }) => thred.id)).toContain(thredId1);
      expect(threds.map((thred: { id: any; }) => thred.id)).toContain(thredId2);
    });
    engineConnMan.eventQ.queue(getThredsEvent);
    return pr;
  });
  test('terminate all Threds', async function () {
    const terminateAllThredsEvent = SystemEvents.getTerminateAllThredsEvent(adminTestSource);
    const pr = withDispatcherPromise(engineConnMan.engine.dispatchers, async (message: Message) => {
      expect(message.event.type).toBe('org.wt.tell');
      expect(message.event.re).toBe(terminateAllThredsEvent.id);
      expect(Events.assertSingleValues(message.event).status).toBe(systemEventTypes.successfulStatus);
      expect(Events.assertSingleValues(message.event).op).toBe(systemEventTypes.operations.terminateAllThreds);
      expect(await engineConnMan.engine.numThreds).toBe(0);
    });
    engineConnMan.eventQ.queue(terminateAllThredsEvent);
    return pr;
  });
  test('shutdown after 10 secs...)', async function () {
    const shutdownEvent = SystemEvents.getShutdownEvent(10000, adminTestSource);
    const pr = withDispatcherPromise(engineConnMan.engine.dispatchers, (message: Message) => {
      expect(message.event.type).toBe('org.wt.tell');
      expect(message.event.re).toBe(shutdownEvent.id);
      expect(Events.assertSingleValues(message.event).status).toBe(systemEventTypes.successfulStatus);
      expect(Events.assertSingleValues(message.event).op).toBe(systemEventTypes.operations.shutdown);
    });
    engineConnMan.eventQ.queue(shutdownEvent);
    return pr;
  });
  afterAll(async () => {
    await engineConnMan.purgeAll();
    await engineConnMan.disconnectAll();
  });
});

let engineConnMan: EngineConnectionManager;
let thredId0: string | undefined;
let thredId1: string | undefined;
let thredId2: string | undefined;

