import { PatternModel, Logger, LoggerLevel, EventManager } from '../../ts/thredlib/index.js';
import { events, withPromiseHandlers } from '../testUtils.js';

Logger.setLevel(LoggerLevel.INFO);

// @NOTE
// this runs against a running server running 'simple_test.pattern.json' and simple_test_sessions_model.json
// @TODO - right now it doesn't clean up sessions and threds....

describe('client connection test', function () {
  beforeAll(async () => {
    eventManager0 = new EventManager();
    eventManager1 = new EventManager();
  });
  test('Connect to server', async function () {
    await eventManager0
      .connect('http://localhost:3000', { transports: ['websocket'], jsonp: false, auth: { token: 'participant0' } })
      .catch((e) => {
        Logger.error(e);
      });
    await eventManager1
      .connect('http://localhost:3000', { transports: ['websocket'], jsonp: false, auth: { token: 'participant1' } })
      .catch((e) => {
        Logger.error(e);
      });
  });

  // pattern sets the "re" value to the event ID of the request allowing for testing with the exchangeWithPromise method
  test('Dispatch inception event and match outbound event', async function () {
    const responseEvent = await eventManager0.exchangeWithPromise(events.event0);
    thredId = responseEvent.thredId;
    expect(responseEvent.data?.title).toBe('outbound.event0');
  });

  test('Dispatch event1, receive event1 by participant1', async function () {
    const pr = eventManager1.subscribeOnceWithPromise({ filter: `$event.data.title = 'outbound.event1'` });
    eventManager0.publish({ ...events.event1, thredId });
    const responseEvent = await pr;
    expect(responseEvent.data?.title).toBe('outbound.event1');
    return pr;
  });

  test('Dispatch event2, receive event2 by participant0', function () {
    const pr = new Promise<void>((resolve, reject) => {
      eventManager0.subscribe(
        withPromiseHandlers(
          (event) => {
            expect(event.data?.title).toBe('outbound.event2');
          },
          resolve,
          reject,
        ),
      );
    });
    eventManager1.publish({ ...events.event2, thredId });
  });

  // cleanup in case of failure
  afterAll(async () => {
    eventManager0.disconnect();
    eventManager1.disconnect();
  });
});

let eventManager0: EventManager;
let eventManager1: EventManager;
let thredId: string | undefined;
