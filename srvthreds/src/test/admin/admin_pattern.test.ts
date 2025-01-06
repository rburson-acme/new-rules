import {
  Logger,
  LoggerLevel,
  systemEventTypes,
  PatternModel,
  Message,
  Events,
  SystemEvents,
  SMap,
} from '../../ts/thredlib/index.js';
import { delay, EngineConnectionManager, events, withDispatcherPromise, withReject } from '../testUtils.js';
import { PersistenceFactory } from '../../ts/persistence/PersistenceFactory.js';
import { adminTestPatternModels, adminTestSource } from './adminTestUtils.js';

Logger.setLevel(LoggerLevel.ERROR);

describe('admin system test', function () {
  beforeAll(async () => {
    engineConnMan = await EngineConnectionManager.newEngineInstance(adminTestPatternModels);
    await engineConnMan.purgeAll();
  });
  test('should have loaded test pattern', async function () {
    const pattern = engineConnMan.engine.thredsStore.patternsStore.getPattern('systemTest');
    expect(pattern).toBeDefined();
    expect(pattern?.name).toBe('System Test');
    patternCreationTime = engineConnMan.engine.thredsStore.patternsStore.patternStore('systemTest').timestamp;
  });
  test('should save a modified pattern', function () {
    const savePatternEvent = SystemEvents.getSavePatternEvent({ ...adminTestPatternModels[0], name: 'Modified System Test' }, adminTestSource);
    const pr = withDispatcherPromise(engineConnMan.engine.dispatchers, (message: Message) => {
      expect((message.event.data?.content?.values as SMap).error).toBeUndefined();
      // should return id as result if successful
      expect((message.event.data?.content?.values as SMap).result).contains('systemTest');
    });
    engineConnMan.eventQ.queue(savePatternEvent);
    return pr;
  });
  test('Reload Pattern', async function () {
    const reloadPatternEvent = SystemEvents.getReloadPatternEvent('systemTest', adminTestSource);
    const pr = withDispatcherPromise(engineConnMan.engine.dispatchers, (message: Message) => {
      expect(message.event.type).toBe('org.wt.tell');
      expect(message.event.re).toBe(reloadPatternEvent.id);
      expect(Events.assertSingleValues(message.event).status).toBe(systemEventTypes.successfulStatus);
    });
    engineConnMan.eventQ.queue(reloadPatternEvent);
    // wait for signalling to complete
    await delay(1000);
    return pr;
  });
  test('should have reloaded modified test pattern', async function () {
    const pattern = engineConnMan.engine.thredsStore.patternsStore.getPattern('systemTest');
    expect(pattern).toBeDefined();
    expect(pattern?.name).toBe('Modified System Test');
  });
  afterAll(async () => {
    PersistenceFactory.getPersistence().removeDatabase();
    await engineConnMan.purgeAll();
    await engineConnMan.disconnectAll();
  });
});

let engineConnMan: EngineConnectionManager;
let patternCreationTime: number;

