import { Logger, LoggerLevel, systemEventTypes, Message, Events, SystemEvents } from '../../ts/thredlib/index.js';
import { bootstrap, EngineConnectionManager, withDispatcherPromise } from '../testUtils.js';
import { adminTestPatternModels, userTestSource } from './adminTestUtils.js';

Logger.setLevel(LoggerLevel.ERROR);

describe.skip('system spec retrieval tests', function () {
  beforeAll(async () => {
    //await bootstrap();
    await engineConnMan.purgeAll();
    engineConnMan = await EngineConnectionManager.newEngineInstance(adminTestPatternModels);
  });
  test('get system spec', async function () {
    const getSystemSpecEvent = SystemEvents.getGetSystemSpecEvent(userTestSource);
    const pr = withDispatcherPromise(engineConnMan.engine.dispatchers, (message: Message) => {
      expect(message.event.type).toBe('org.wt.tell');
      expect(message.event.re).toBe(getSystemSpecEvent.id);
      expect(Events.assertSingleValues(message.event).status).toBe(systemEventTypes.successfulStatus);
      expect(Events.assertSingleValues(message.event).op).toBe(systemEventTypes.operations.user.getSystemSpec);
    });
    engineConnMan.eventQ.queue(getSystemSpecEvent);
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
