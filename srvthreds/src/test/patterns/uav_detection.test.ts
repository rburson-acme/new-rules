import { PatternModel, Logger, LoggerLevel, Event, EventBuilder, Events, EventTask } from '../../ts/thredlib/index.js';
import { EngineConnectionManager, withDispatcherPromise } from '../testUtils.js';
import { patternModel } from '../../ts/config/patterns/ts/uav_detection_pattern.js';
const patternModels: PatternModel[] = [patternModel as PatternModel];

Logger.setLevel(LoggerLevel.DEBUG);

describe('UAV detection test', function () {
  beforeAll(async () => {
    connMan = await EngineConnectionManager.newEngineInstance(patternModels);
    await connMan.purgeAll();
  });
  // should match pattern's first reaction, start a thred, send event to persistence agent
  // set test thredId to this thred
  it('inbound inception event', function () {
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
      expect(taskArray[0].params!.matcher!.sensorId).toBe(sensorId);
    });
    connMan.eventQ.queue(sensorEvent);
    return pr;
  });
  it('inbound persistence reply', function () {
    const pr = withDispatcherPromise(connMan.engine.dispatchers, async (message) => {
      const event = message.event;
      expect(await connMan.engine.numThreds).toBe(1);
      expect(message.to).toContain('demo_contact_id');
      expect(event.type).toBe('org.wt.tell');
      expect(event.thredId).toBe(thredId);
      expect(event.data.advice).toBeTruthy();
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

const sensorId = '1000000001';
// create a base builder with the common parameters
const sensorEvent = EventBuilder.create({
  type: 'org.wt.sensor.detectionEvent',
  source: { id: 'sensor_agent1', name: 'Sensor Agent 1' },
})
  .mergeValues({ lattitude: 34.0522, longitude: -118.2437, sensorId, certainty: 0.9 })
  .mergeData({ title: 'Aerial Activity Detected' })
  .build();

const persistenceEvent = EventBuilder.create({
  type: 'org.wt.persistence',
  source: { id: 'persistence1', name: 'Persistence Agent' },
})
  .mergeValues([{ contactId: 'demo_contact_id' }])
  .build();
