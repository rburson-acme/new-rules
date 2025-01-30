import { PersistenceFactory } from '../../ts/persistence/PersistenceFactory.js';
import { Logger, LoggerLevel, Message, SystemEvents, SMap, Events, ThredId } from '../../ts/thredlib/index.js';
import { EngineConnectionManager, withDispatcherPromise } from '../testUtils.js';
import { adminTestPatternModels, adminTestSource } from './adminTestUtils.js';

Logger.setLevel(LoggerLevel.ERROR);

describe('admin persistence test', function () {
  beforeAll(async () => {
    engineConnMan = await EngineConnectionManager.newEngineInstance(adminTestPatternModels);
    await engineConnMan.purgeAll();
  });
  test('should save a pattern', function () {
    const savePatternEvent = SystemEvents.getSavePatternEvent(adminTestPatternModels[0], adminTestSource);
    const pr = withDispatcherPromise(engineConnMan.engine.dispatchers, (message: Message) => {
      expect(message.event.type).toBe('org.wt.tell');
      expect(message.event.data?.content?.values).toBeTruthy();
      expect(message.event.data?.content?.error).toBeUndefined();
      // should return id as result if successful
      expect(Events.valueNamed(message.event, 'result')).contains('systemTest');
    });
    engineConnMan.eventQ.queue(savePatternEvent);
    return pr;
  });
  test('should retrieve a pattern', function () {
    const findPatternEvent = SystemEvents.getFindPatternEvent('systemTest', adminTestSource);
    const pr = withDispatcherPromise(engineConnMan.engine.dispatchers, (message: Message) => {
      expect(message.event.type).toBe('org.wt.tell');
      expect((Events.valueNamed(message.event, 'result'))[0].name).toBe('System Test');
      expect(message.event.data?.content?.error).toBeUndefined();
    });
    engineConnMan.eventQ.queue(findPatternEvent);
    return pr;
  });
  test('should update a pattern', function () {
    const updatePatternEvent = SystemEvents.getUpdatePatternEvent('systemTest', adminTestSource, {
      'reactions.0.name': 'first reaction renamed',
    });
    const pr = withDispatcherPromise(engineConnMan.engine.dispatchers, (message: Message) => {
      expect(message.event.type).toBe('org.wt.tell');
      expect(message.event.data?.content?.values).toBeTruthy();
      expect(message.event.data?.content?.error).toBeUndefined();
    });
    engineConnMan.eventQ.queue(updatePatternEvent);
    return pr;
  });
  test('should retrieve a pattern', function () {
    const findPatternEvent = SystemEvents.getFindPatternEvent('systemTest', adminTestSource);
    const pr = withDispatcherPromise(engineConnMan.engine.dispatchers, (message: Message) => {
      expect((Events.valueNamed(message.event, 'result'))[0].reactions[0].name).toBe('first reaction renamed');
      expect(message.event.data?.content?.error).toBeUndefined();
    });
    engineConnMan.eventQ.queue(findPatternEvent);
    return pr;
  });
  test('should delete a pattern', function () {
    const deletePatternEvent = SystemEvents.getDeletePatternEvent('systemTest', adminTestSource);
    const pr = withDispatcherPromise(engineConnMan.engine.dispatchers, (message: Message) => {
      expect(message.event.type).toBe('org.wt.tell');
      expect(Events.valueNamed(message.event, 'result')).toBeTruthy();
      expect(message.event.data?.content?.error).toBeUndefined();
    });
    engineConnMan.eventQ.queue(deletePatternEvent);
    return pr;
  });
  test('should not find deleted pattern', function () {
    const findPatternEvent = SystemEvents.getFindPatternEvent('systemTest', adminTestSource);
    const pr = withDispatcherPromise(engineConnMan.engine.dispatchers, (message: Message) => {
      expect(message.event.type).toBe('org.wt.tell');
      expect(Events.valueNamed(message.event, 'result')).toBeTruthy();
      expect(message.event.data?.content?.error).toBeUndefined();
    });
    engineConnMan.eventQ.queue(findPatternEvent);
    return pr;
  });
  test('should retrieve events for thred', function () {
    const findEventsEvent = SystemEvents.getEventsForThredEvent(ThredId.SYSTEM, adminTestSource);
    const pr = withDispatcherPromise(engineConnMan.engine.dispatchers, (message: Message) => {
      expect(message.event.type).toBe('org.wt.tell');
      expect(message.event.data?.content?.error).toBeUndefined();
      expect(Events.valueNamed(message.event, 'result')).toBeTruthy();
      expect(Events.valueNamed(message.event, 'result')[0].length).toBe(12);
      expect(Events.valueNamed(message.event, 'result')[0][0].event.data.title).toBe('Store Pattern System Test');
    });
    engineConnMan.eventQ.queue(findEventsEvent);
    return pr;
  });
  test('should retrieve thredlog for thred', function () {
    const getThredLogEvent = SystemEvents.getThredLogForThredEvent(ThredId.SYSTEM, adminTestSource);
    const pr = withDispatcherPromise(engineConnMan.engine.dispatchers, (message: Message) => {
      expect(message.event.type).toBe('org.wt.tell');
      expect(message.event.data?.content?.error).toBeUndefined();
      expect(Events.valueNamed(message.event, 'result')).toBeTruthy();
    });
    engineConnMan.eventQ.queue(getThredLogEvent);
    return pr;
  });
  afterAll(async () => {
    PersistenceFactory.getPersistence().deleteDatabase();
    await engineConnMan.purgeAll();
    await engineConnMan.disconnectAll();
  });
});

let engineConnMan: EngineConnectionManager;
