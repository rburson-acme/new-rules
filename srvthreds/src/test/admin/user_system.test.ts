import { Logger, LoggerLevel, systemEventTypes, Message, Events, SystemEvents } from '../../ts/thredlib/index.js';
import { createUserDbFixtures, EngineConnectionManager, events, withDispatcherPromise } from '../testUtils.js';
import { adminTestPatternModels, adminTestSource, userTestSource } from './adminTestUtils.js';

Logger.setLevel(LoggerLevel.ERROR);

describe('user functions system test', function () {
  beforeAll(async () => {
    engineConnMan = await EngineConnectionManager.newEngineInstance(adminTestPatternModels);
    await engineConnMan.purgeAll();
    await createUserDbFixtures();
  });
  test('should start a new thred', function () {
    const pr = withDispatcherPromise(engineConnMan.engine.dispatchers, async (message: Message) => {
      expect(await engineConnMan.engine.numThreds).toBe(1);
      expect(message.event.data?.title).toBe('outbound.event0');
      expect(message.event.re).toBe('0');
      expect(message.to).toContain('outbound.event0.recipient');
      thredId0 = message.event.thredId;
    });
    engineConnMan.eventQ.queue({ ...events.event0, ...{ source: userTestSource } });
    return pr;
  });
  // admin (we need to archive atleast one thred for testing)
  test('admin should terminate Thred', async function () {
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
      expect(message.to).toContain('outbound.event0.recipient');
      thredId1 = message.event.thredId;
    });
    engineConnMan.eventQ.queue({ ...events.event0, ...{ source: userTestSource }, ...{ id: 'userThredTest1' } });
    return pr;
  });
  test('should start an additional Thred', function () {
    const pr = withDispatcherPromise(engineConnMan.engine.dispatchers, async (message: Message) => {
      expect(await engineConnMan.engine.numThreds).toBe(2);
      expect(message.event.data?.title).toBe('outbound.event0');
      expect(message.to).toContain('outbound.event0.recipient');
      thredId2 = message.event.thredId;
    });
    engineConnMan.eventQ.queue({ ...events.event0, ...{ source: userTestSource }, ...{ id: 'userThredTest2' } });
    return pr;
  });
  test('get All Active Threds', async function () {
    const getThredsEvent = SystemEvents.getGetUserThredsEvent(userTestSource);
    const pr = withDispatcherPromise(engineConnMan.engine.dispatchers, (message: Message) => {
      expect(message.event.type).toBe('org.wt.tell');
      expect(message.event.re).toBe(getThredsEvent.id);
      expect(Events.assertSingleValues(message.event).status).toBe(systemEventTypes.successfulStatus);
      expect(Events.assertSingleValues(message.event).op).toBe(systemEventTypes.operations.user.getThreds);
      const results: any[] = Events.valueNamed(message.event, 'results');
      expect(results).length(2);
      expect(results.map((result: { thred: any }) => result.thred.id)).toContain(thredId1);
      expect(results.map((result: { thred: any }) => result.thred.id)).toContain(thredId2);
      expect(results.map((result: { lastEvent: any }) => result.lastEvent.id)).toContain('userThredTest1');
      expect(results.map((result: { lastEvent: any }) => result.lastEvent.id)).toContain('userThredTest2');
      results.every((result) => {
        expect(result.thred.meta.label).toBeDefined();
        expect(result.thred.lastUpdateTime).toBeGreaterThan(0);
        expect(result.lastEvent).toBeDefined();
      });
      expect(results.map((result: { thred: any }) => result.thred.currentReaction.reactionName)).toContain(
        'event1Reaction',
      );
    });
    engineConnMan.eventQ.queue(getThredsEvent);
    return pr;
  });
  test('get All User Terminated Threds', async function () {
    const getThredsEvent = SystemEvents.getGetUserThredsEvent(userTestSource, 'terminated');
    const pr = withDispatcherPromise(engineConnMan.engine.dispatchers, (message: Message) => {
      expect(message.event.type).toBe('org.wt.tell');
      expect(message.event.re).toBe(getThredsEvent.id);
      expect(Events.assertSingleValues(message.event).status).toBe(systemEventTypes.successfulStatus);
      expect(Events.assertSingleValues(message.event).op).toBe(systemEventTypes.operations.getThreds);
      const results = Events.valueNamed(message.event, 'results');
      expect(results).length(1);
      expect(results[0].thred.id).toBe(thredId0);
      expect(results.map((result: { lastEvent: any }) => result.lastEvent.id)).toContain('0');
    });
    engineConnMan.eventQ.queue(getThredsEvent);
    return pr;
  });
  test('get All Threds', async function () {
    const getThredsEvent = SystemEvents.getGetUserThredsEvent(userTestSource, 'all');
    const pr = withDispatcherPromise(engineConnMan.engine.dispatchers, (message: Message) => {
      expect(message.event.type).toBe('org.wt.tell');
      expect(message.event.re).toBe(getThredsEvent.id);
      expect(Events.assertSingleValues(message.event).status).toBe(systemEventTypes.successfulStatus);
      expect(Events.assertSingleValues(message.event).op).toBe(systemEventTypes.operations.getThreds);
      const results = Events.valueNamed(message.event, 'results');
      expect(results).length(3);
      expect(results.map((result: { thred: any }) => result.thred.id)).toContain(thredId1);
      expect(results.map((result: { thred: any }) => result.thred.id)).toContain(thredId2);
      expect(results.map((result: { thred: any }) => result.thred.id)).toContain(thredId0);
      expect(results.map((result: { lastEvent: any }) => result.lastEvent.id)).toContain('userThredTest1');
      expect(results.map((result: { lastEvent: any }) => result.lastEvent.id)).toContain('userThredTest2');
      expect(results.map((result: { lastEvent: any }) => result.lastEvent.id)).toContain('0');
    });
    engineConnMan.eventQ.queue(getThredsEvent);
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
