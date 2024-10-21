import { PatternModel, Logger, LoggerLevel, EventManager } from '../../ts/thredlib/index.js';
import { events, withPromiseHandlers } from '../testUtils.js';

Logger.setLevel(LoggerLevel.INFO);

// @NOTE
// this runs against a running server running 'simple_test.pattern.json' and simple_test_sessions_model.json
// @TODO - right now it doesn't clean up sessions and threds....

describe.skip('client connection test', function () {
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
  test('Dispatch inception event and match outbound event', function () {
    const pr = new Promise<void>((resolve, reject) => {
      eventManager0.consumers = new Set([
        withPromiseHandlers(
          (event) => {
            expect(event.data?.title).toBe('outbound.event0');
            thredId = event.thredId;
          },
          resolve,
          reject,
        ),
      ]);
    });
    eventManager0.dispatch(events.event0);
    return pr;
  });
  test('Dispatch event1, receive event1 by participant1', function () {
    const pr = new Promise<void>((resolve, reject) => {
      eventManager1.consumers = new Set([
        withPromiseHandlers(
          (event) => {
            expect(event.data?.title).toBe('outbound.event1');
          },
          resolve,
          reject,
        ),
      ]);
    });
    eventManager0.dispatch({ ...events.event1, thredId });
    return pr;
  });
  test('Dispatch event2, receive event2 by participant0', function () {
    const pr = new Promise<void>((resolve, reject) => {
      eventManager0.consumers = new Set([
        withPromiseHandlers(
        (event) => {
          expect(event.data?.title).toBe('outbound.event2');
        }, resolve, reject),
      ]);
    });
    eventManager1.dispatch({ ...events.event2, thredId });
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
