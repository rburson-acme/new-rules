import {
  Logger,
  LoggerLevel,
  systemEventTypes,
  PatternModel,
  Message,
  Events,
  SystemEvents,
} from '../../ts/thredlib/index.js';
import { createDbFixtures, EngineConnectionManager, events, withDispatcherPromise, withReject } from '../testUtils.js';
import { PersistenceFactory } from '../../ts/persistence/PersistenceFactory.js';
import { adminTestPatternModels, adminTestSource, userTestSource } from './adminTestUtils.js';

Logger.setLevel(LoggerLevel.ERROR);

describe('user functions system test', function () {
  beforeAll(async () => {
    engineConnMan = await EngineConnectionManager.newEngineInstance(adminTestPatternModels);
    await engineConnMan.purgeAll();
    await createDbFixtures();
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
      expect(message.event.re).toBe('0');
      expect(message.to).toContain('outbound.event0.recipient');
      thredId1 = message.event.thredId;
    });
    engineConnMan.eventQ.queue({ ...events.event0, ...{ source: userTestSource } });
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
    engineConnMan.eventQ.queue({ ...events.event0, ...{ source: userTestSource } });
    return pr;
  });
  test('get All Active Threds', async function () {
    const getThredsEvent = SystemEvents.getGetUserThredsEvent(userTestSource);
    const pr = withDispatcherPromise(engineConnMan.engine.dispatchers, (message: Message) => {
      expect(message.event.type).toBe('org.wt.tell');
      expect(message.event.re).toBe(getThredsEvent.id);
      expect(Events.assertSingleValues(message.event).status).toBe(systemEventTypes.successfulStatus);
      expect(Events.assertSingleValues(message.event).op).toBe(systemEventTypes.operations.user.getThreds);
      const threds = Events.valueNamed(message.event, 'threds');
      expect(threds).length(2);
      expect(threds.map((thred: { id: any }) => thred.id)).toContain(thredId1);
      expect(threds.map((thred: { id: any }) => thred.id)).toContain(thredId2);
      expect(
        threds.map((thred: { currentReaction: { reactionName: string } }) => thred.currentReaction.reactionName),
      ).toContain('event1Reaction');
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
      const threds = Events.valueNamed(message.event, 'threds');
      expect(threds).length(1);
      expect(threds[0].id).toBe(thredId0);
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
      const threds = Events.valueNamed(message.event, 'threds');
      expect(threds).length(3);
      expect(threds.map((thred: { id: any }) => thred.id)).toContain(thredId1);
      expect(threds.map((thred: { id: any }) => thred.id)).toContain(thredId2);
      expect(threds.map((thred: { id: any }) => thred.id)).toContain(thredId0);
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
