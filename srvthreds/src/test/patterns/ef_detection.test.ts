import {
  PatternModel,
  Logger,
  LoggerLevel,
  Event,
  EventBuilder,
  Events,
  EventTask,
  Tasks,
} from '../../ts/thredlib/index.js';
import { EngineConnectionManager, withDispatcherPromise } from '../testUtils.js';
import patternModel from '../../ts/config/patterns/ef_detection.pattern.json' assert { type: 'json' };
const patternModels: PatternModel[] = [patternModel as PatternModel];

Logger.setLevel(LoggerLevel.DEBUG);

describe('Enemy forces detection test', function () {
  beforeAll(async () => {
    connMan = await EngineConnectionManager.newEngineInstance(patternModels);
    await connMan.purgeAll();
  });
  // should match pattern's first reaction
  it('test inbound sensor event and notify participants', function () {
    const pr = withDispatcherPromise(connMan.engine.dispatchers, async (message) => {
      const event = message.event;
      thredId = message.event.thredId;
      expect(await connMan.engine.numThreds).toBe(1);
      expect(message.to).toContain('participant0');
      expect(message.to).toContain('participant1');
      expect(event.type).toBe('org.wt.tell');
      expect(event.data?.title).toBe('Possible Contact Detected');
      expect(event.data?.description).toContain(`Sensor ${sensorId}`);
    });
    connMan.eventQ.queue(sensorEvent);
    return pr;
  });
  it('test deploy robot', function () {
    const pr = withDispatcherPromise(connMan.engine.dispatchers, async (message) => {
      const event = message.event;
      expect(await connMan.engine.numThreds).toBe(1);
      expect(message.to).toContain('org.wt.robot');
      expect(event.type).toBe('org.wt.tell');
      expect(event.thredId).toBe(thredId);
      const tasks = Events.getTasks(event) as EventTask[];
      expect(tasks).toHaveLength(1);
      const values = Tasks.getTaskValues(tasks[0]) as Record<string, any>;
      expect(values.location.latitude).toBe(sensorData.latitude);
      expect(values.location.longitude).toBe(sensorData.longitude);
    });
    connMan.eventQ.queue({ ...deployResponseEvent, thredId });
    return pr;
  });
  // should match pattern's first reaction
  it('test inbound robot event and notify participants', function () {
    const pr = withDispatcherPromise(connMan.engine.dispatchers, async (message) => {
      const event = message.event;
      thredId = message.event.thredId;
      expect(await connMan.engine.numThreds).toBe(1);
      expect(message.to).toContain('participant0');
      expect(message.to).toContain('participant1');
      expect(event.type).toBe('org.wt.tell');
      expect(event.data?.title).toBe('Robot Deployed');
      expect(event.data?.description).toContain(`Robot ${robotData.robotId}`);
    });
    connMan.eventQ.queue({ ...robotDeployedEvent, thredId });
    return pr;
  });
  it('test stream video', function () {
    const pr = withDispatcherPromise(connMan.engine.dispatchers, async (message) => {
      const event = message.event;
      expect(await connMan.engine.numThreds).toBe(1);
      expect(message.to).toContain('participant0');
      expect(message.to).toContain('participant1');
      expect(event.type).toBe('org.wt.tell');
      expect(event.data?.title).toBe('Robot Video Stream');
    });
    connMan.eventQ.queue({ ...streamResponseEvent, thredId });
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
const sensorData = { latitude: 34.0522, longitude: -118.2437, sensorId, certainty: 0.9 };
const robotData = {
  latitude: 34.0333,
  longitude: -118.2445,
  robotId: 'spot_1',
  videoStreamUrl: 'http://example.com/robot_video',
};

const sensorEvent = EventBuilder.create({
  type: 'org.cmi2.sensor.detectionEvent',
  source: { id: 'sensor_agent0', name: 'Sensor Agent 1' },
})
  .mergeValues(sensorData)
  .mergeData({ title: 'Aerial Activity Detected' })
  .build();

const deployResponseEvent = EventBuilder.create({
  type: 'org.wt.client.tell',
  source: { id: 'participant0', name: 'Participant 0' },
})
  .mergeValues([{ deploy_robot_response: true }])
  .build();

const robotDeployedEvent = EventBuilder.create({
  type: 'org.wt.robot',
  source: { id: 'org.wt.robot1', name: 'Spot 1' },
})
  .mergeValues([robotData])
  .build();

const streamResponseEvent = EventBuilder.create({
  type: 'org.wt.client.tell',
  source: { id: 'participant0', name: 'Participant 0' },
})
  .mergeValues([{ video_stream_response: true }])
  .build();
