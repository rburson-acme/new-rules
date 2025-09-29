import { PatternModel, Logger, LoggerLevel, Event, EventBuilder, Events, EventTask } from '../../ts/thredlib/index.js';
import { EngineConnectionManager, withDispatcherPromise } from '../testUtils.js';
import patternModel from '../config/patterns/system_test.pattern.json' with { type: 'json' };
const patternModels: PatternModel[] = [patternModel as PatternModel];

Logger.setLevel(LoggerLevel.DEBUG);

describe('System Test 0', function () {
  beforeAll(async () => {
    connMan = await EngineConnectionManager.newEngineInstance(patternModels);
    await connMan.purgeAll();
  });
  // should match pattern's first reaction, start a thred, send event to persistence agent
  // set test thredId to this thred
  it('location event detected', function () {
    const pr = withDispatcherPromise(connMan.engine.dispatchers, async (message) => {
      const event = message.event;
      thredId = message.event.thredId;
      expect(await connMan.engine.numThreds).toBe(1);
      expect(message.to).toContain('org.wt.persistence');
      expect(event.type).toBe('org.wt.tell');
      expect(event.data?.content?.tasks).toBeTruthy();
      const taskArray: EventTask[] = Events.getTasks(event) as EventTask[];
      expect(taskArray).toHaveLength(1);
      expect(taskArray[0].op).toBe('get');
      expect(taskArray[0].params!.matcher!.locationId).toBe(locationId);
    });
    connMan.eventQ.queue(locationEvent);
    return pr;
  });
  it('inbound persistence reply', function () {
    const pr = withDispatcherPromise(connMan.engine.dispatchers, async (message) => {
      const event = message.event;
      expect(await connMan.engine.numThreds).toBe(1);
      expect(message.to).toContain('participant1');
      expect(event.type).toBe('org.wt.tell');
      expect(event.thredId).toBe(thredId);
      expect(event.data.content.values).toBeTruthy();
      expect(event.data.content.values.locationId).toBe(locationId);
    });
    connMan.eventQ.queue({ ...persistenceEvent, thredId });
    return pr;
  });
  // cleanup in case of failure
  afterAll(async () => {
    await connMan.stopAllThreds();
    await connMan.purgeAll();
    await connMan.disconnectAll();
  });
});

let connMan: EngineConnectionManager;
let thredId: string | undefined;

const locationId = '100';
// create a base builder with the common parameters
const locationEvent = EventBuilder.create({
  type: 'org.location.event',
  source: { id: 'location_agent0', name: 'Location Agent 0' },
})
  .mergeValues({ latitude: 34.0522, longitude: -118.2437, locationId })
  .mergeData({ title: 'Location Event Detected' })
  .build();

const persistenceEvent = EventBuilder.create({
  type: 'org.wt.persistence',
  source: { id: 'org.wt.persistence', name: 'Persistence Agent' },
})
  .mergeValues([{ participantId: 'participant1' }])
  .build();
