import { PersistenceFactory } from '../../ts/persistence/PersistenceFactory.js';
import {
  Logger,
  LoggerLevel, Message, SystemEvents,
  SMap
} from '../../ts/thredlib/index.js';
import { EngineConnectionManager, withDispatcherPromise } from '../testUtils.js';
import { adminTestPatternModels, adminTestSource } from './adminTestUtils.js';

Logger.setLevel(LoggerLevel.DEBUG);

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
      expect((message.event.data?.content?.values as SMap).error).toBeUndefined();
      // should return id as result if successful
      expect((message.event.data?.content?.values as SMap).result).contains('systemTest');
    });
    engineConnMan.eventQ.queue(savePatternEvent);
    return pr;
  });
   afterAll(async () => {
    PersistenceFactory.getPersistence().removeDatabase();
    await engineConnMan.purgeAll();
    await engineConnMan.disconnectAll();
  });
});

let engineConnMan: EngineConnectionManager;
