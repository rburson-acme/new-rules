import { Logger, LoggerLevel, systemEventTypes, Message, Events, SystemEvents } from '../../ts/thredlib/index.js';
import { EngineConnectionManager, withDispatcherPromise } from '../testUtils.js';
import { adminTestPatternModels, userTestSource } from './adminTestUtils.js';

Logger.setLevel(LoggerLevel.ERROR);

describe('system spec retrieval tests', function () {
  beforeAll(async () => {
    engineConnMan = await EngineConnectionManager.newEngineInstance(adminTestPatternModels, true);
    await engineConnMan.initBootstrapped();
  });
  test('get system spec', async function () {
    const getSystemSpecEvent = SystemEvents.getGetSystemSpecEvent(userTestSource);
    const pr = withDispatcherPromise(engineConnMan.engine.dispatchers, (message: Message) => {
      expect(message.event.type).toBe('org.wt.tell');
      expect(message.event.re).toBe(getSystemSpecEvent.id);
      expect(Events.assertSingleValues(message.event).status).toBe(systemEventTypes.successfulStatus);
      expect(Events.assertSingleValues(message.event).op).toBe(systemEventTypes.operations.user.getSystemSpec);
      const systemSpec = Events.valueNamed(message.event, 'systemSpec');
      expect(systemSpec).toBeDefined();
      expect(systemSpec.serviceSpecs.length).toBeGreaterThan(0);
      expect(systemSpec.addressSpec).toBeDefined();
      expect(systemSpec.addressSpec.participants.length).toBeGreaterThan(0);
      expect(systemSpec.addressSpec.groups.length).toBeGreaterThan(0);
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
