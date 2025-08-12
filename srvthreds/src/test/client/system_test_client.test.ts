import { PatternModel, Logger, LoggerLevel, EventManager, EventBuilder, Tasks, Events, EventTask } from '../../ts/thredlib/index.js';
import { events, withPromiseHandlers } from '../testUtils.js';

Logger.setLevel(LoggerLevel.INFO);

// @NOTE
// this runs against a running server running 'system_test.pattern.json' and simple_test_sessions_model.json
// @TODO - right now it doesn't clean up sessions and threds....

describe('system_test client test', function () {
  beforeAll(async () => {
    participant1EventManager = new EventManager();
    locationAgentEventManager = new EventManager();
  });
  test('Connect to server', async function () {
    await participant1EventManager
      .connect('http://localhost:3000', { transports: ['websocket'], jsonp: false, auth: { token: 'participant1' } })
      .catch((e) => {
        Logger.error(e);
      });
    await locationAgentEventManager
      .connect('http://localhost:3000', { transports: ['websocket'], jsonp: false, auth: { token: 'location_agent0' } })
      .catch((e) => {
        Logger.error(e);
      });
  });
  test('test location event', async function () {
    const pr = participant1EventManager.subscribeOnceWithPromise({ filter: `$event.type = 'org.wt.tell'` });
    locationAgentEventManager.publish(locationEvent);
    const responseEvent  = await pr;
    expect(responseEvent.data?.title).toBe('Location Event Detected');
    expect(responseEvent.data?.description).toContain(`Location ${locationId}`);
    expect(Events.valueNamed(responseEvent, 'locationId')).toBe(locationId);
    thredId = responseEvent.thredId;
  });
  // cleanup in case of failure
  afterAll(async () => {
    participant1EventManager.disconnect();
    locationAgentEventManager.disconnect();
  });
});

let participant1EventManager: EventManager;
let locationAgentEventManager: EventManager;
let thredId: string | undefined;

const locationId = '1';
const sensorData = { latitude: 34.0522, longitude: -118.2437, locationId };

const locationEvent = EventBuilder.create({
  type: 'org.location.event',
  source: { id: 'location_agent0', name: 'Location Agent 0' },
})
  .mergeValues(sensorData)
  .mergeData({ title: 'Location Event Detected' })
  .build();