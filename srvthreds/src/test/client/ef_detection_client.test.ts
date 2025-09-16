import { Logger, LoggerLevel, EventManager, EventBuilder } from '../../ts/thredlib/index.js';

Logger.setLevel(LoggerLevel.INFO);

// @NOTE
// this runs against a running server running 'ef_detection.pattern.json' and simple_test_sessions_model.json
// @TODO - right now it doesn't clean up sessions and threds....

describe('ef_detection client test', function () {
  beforeAll(async () => {
    eventManager0 = new EventManager();
    sensorAgentEventManager = new EventManager();
  });
  test('Connect to server', async function () {
    await eventManager0
      .connect('http://localhost:3000', { transports: ['websocket'], jsonp: false, auth: { token: 'participant0' } })
      .catch((e) => {
        Logger.error(e);
      });
    await sensorAgentEventManager
      .connect('http://localhost:3000', { transports: ['websocket'], jsonp: false, auth: { token: 'sensor_agent0' } })
      .catch((e) => {
        Logger.error(e);
      });
  });
  test('test sensor event', async function () {
    const pr = eventManager0.subscribeOnceWithPromise({ filter: `$event.type = 'org.wt.tell'` });
    sensorAgentEventManager.publish(sensorEvent);
    const responseEvent = await pr;
    expect(responseEvent.data?.title).toBe('Possible Contact Detected');
    expect(responseEvent.data?.description).toContain(`Sensor ${sensorId}`);
    thredId = responseEvent.thredId;
  });
  test('test participant deploy response', async function () {
    const pr = eventManager0.subscribeOnceWithPromise({ filter: `$event.type = 'org.wt.tell'` });
    eventManager0.publish({ ...participantDeployResponseEvent, thredId });
    const responseEvent = await pr;
    expect(responseEvent.data?.title).toBe('Robot Deployed');
  });
  test('test participant stream response', async function () {
    const pr = eventManager0.subscribeOnceWithPromise({ filter: `$event.type = 'org.wt.tell'` });
    eventManager0.publish({ ...streamResponseEvent, thredId });
    const responseEvent = await pr;
    expect(responseEvent.data?.title).toBe('Robot Video Stream');
  });
  // cleanup in case of failure
  afterAll(async () => {
    eventManager0.disconnect();
    sensorAgentEventManager.disconnect();
  });
});

let eventManager0: EventManager;
let sensorAgentEventManager: EventManager;
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

const participantDeployResponseEvent = EventBuilder.create({
  type: 'org.wt.client.tell',
  source: { id: 'participant0', name: 'Participant 0' },
})
  .mergeValues([{ deploy_robot_response: true }])
  .build();

const streamResponseEvent = EventBuilder.create({
  type: 'org.wt.client.tell',
  source: { id: 'participant0', name: 'Participant 0' },
})
  .mergeValues([{ video_stream_response: true }])
  .build();
