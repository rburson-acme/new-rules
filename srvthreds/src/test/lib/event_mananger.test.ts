import { EventManager, Logger, LoggerLevel, Event } from '../../ts/thredlib/index.js';
import { delay, events, withPromiseHandlers } from '../testUtils.js';

Logger.setLevel(LoggerLevel.INFO);

describe('event manager test', function () {
  test('test basic subscribe', async function () {
    const pr = new Promise((resolve, reject) => {
      eventManager.subscribe(
        withPromiseHandlers(
          (event) => {
            expect(event).toEqual(events.event0);
            eventManager.unsubscribeAll();
          },
          resolve,
          reject,
        ),
      );
    });
    (eventManager as any).connectionListener(events.event0);
    return pr;
  });
  test('test subscribe w/ filter called for matching event', async function () {
    const pr = new Promise((resolve, reject) => {
      eventManager.subscribe(
        withPromiseHandlers(
          (event) => {
            expect(event).toEqual(events.event0);
            eventManager.unsubscribeAll();
          },
          resolve,
          reject,
        ),
        { filter: "$event.type = 'inbound.event0'" },
      );
    });
    (eventManager as any).connectionListener(events.event0);
    return pr;
  });
  test('test subscribe w/ filter not called for non-matching event', async function () {
    const pr = new Promise((resolve, reject) => {
      eventManager.subscribe(
        withPromiseHandlers(
          (event) => {
            throw new Error('should not be called');
          },
          resolve,
          reject,
        ),
        { filter: "$event.type = 'inbound.event1'" },
      );
      delay(100).then(resolve);
      eventManager.unsubscribeAll();
    });
    (eventManager as any).connectionListener(events.event0);
    return pr;
  });
  test('test subscribe w/ filter once', async function () {
    eventManager.publish = (event: Event) => {};
    const pr = new Promise((resolve, reject) => {
      eventManager.subscribeOnce(
        withPromiseHandlers(
          (event) => {
            expect(event).toEqual(events.event0);
          },
          resolve,
          reject,
        ),
        { filter: "$event.type = 'inbound.event0'" },
      );
    });
    expect((eventManager as any).subscribers.size).toBe(1);
    (eventManager as any).connectionListener(events.event0);
    return pr;
  });
  test('test subscribe w/ filter once - should have removed subscriber', async function () {
    expect((eventManager as any).subscribers.size).toBe(0);
  });
  test('test exchange', async function () {
    const pr = new Promise((resolve, reject) => {
      eventManager.exchange(
        events.event0,
        withPromiseHandlers(
          (event) => {
            expect(event).toEqual(events.event1);
          },
          resolve,
          reject,
        ),
      );
    });
    expect((eventManager as any).subscribers.size).toBe(1);
    // event1 has a 're' property that is set to 0
    (eventManager as any).connectionListener(events.event1);
    return pr;
  });
  test('test exchange should have removed subscriber', async function () {
    expect((eventManager as any).subscribers.size).toBe(0);
  });
});

const eventManager = new EventManager();
