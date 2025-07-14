import { SystemThreds } from '../../ts/admin/SystemThreds.js';
import {
  Logger,
  LoggerLevel,
  systemEventTypes,
  Message,
  Events,
  SystemEvents,
  addressToArray,
} from '../../ts/thredlib/index.js';
import { EngineConnectionManager, withDispatcherPromise, withReject, events } from '../testUtils.js';
import { adminTestPatternModels, adminTestSource } from './adminTestUtils.js';

Logger.setLevel(LoggerLevel.DEBUG);

describe('watch threds admin test', function () {
  beforeAll(async () => {
    engineConnMan = await EngineConnectionManager.newEngineInstance(adminTestPatternModels);
    await engineConnMan.purgeAll();
  });

  test('should successfully register for thred notifications using watchThreds', async function () {
    const watchThredsEvent = SystemEvents.getWatchThredsEvent(adminTestSource);
    watchEventId = watchThredsEvent.id;
    const pr = withDispatcherPromise(engineConnMan.engine.dispatchers, (message: Message) => {
      expect(message.event.type).toBe('org.wt.tell');
      expect(message.event.re).toBe(watchThredsEvent.id);
      expect(Events.assertSingleValues(message.event).status).toBe(systemEventTypes.successfulStatus);
      expect(Events.assertSingleValues(message.event).op).toBe(systemEventTypes.operations.watchThreds);
    });

    engineConnMan.eventQ.queue(watchThredsEvent);
    return pr;
  });

  test('should create a thred and receive notification', async function () {
    const pr = new Promise<void>((resolve, reject) => {
      let messagesReceived = 0;
      let thredCreationReceived = false;
      let notificationReceived = false;
      const checkCompletion = () => thredCreationReceived && notificationReceived && resolve();
      engineConnMan.engine.dispatchers = [
        withReject(async (message: Message) => {
          messagesReceived++;
          // Check for thred creation response
          if (message.event.data?.title === 'outbound.event0') {
            expect(await engineConnMan.engine.numThreds).toBe(1);
            expect(message.event.re).toBe('0');
            expect(message.to).toContain('outbound.event0.recipient');
            thredId = message.event.thredId;
            thredCreationReceived = true;
            checkCompletion();
          }
          // Check for notification event - this is sent to the admin user
          else if (
            message.event.type === 'org.wt.tell' &&
            addressToArray(message.to).includes(adminTestSource.id) &&
            Events.valueNamed(message.event, 'threds')
          ) {
            expect(message.event.re).toBe(watchEventId);
            const threds = Events.valueNamed(message.event, 'threds');
            expect(threds).toBeDefined();
            expect(threds.length).toBeGreaterThan(0);
            expect(threds[0].status).toBe('a'); // active
            expect(threds[0].patternId).toBe('systemTest');
            notificationReceived = true;
            checkCompletion();
          }
          if (messagesReceived > 2) {
            reject(
              new Error(
                `Too many messages received without finding expected notification. Last message: ${JSON.stringify(message)}`,
              ),
            );
          }
        }, reject),
      ];
    });

    engineConnMan.eventQ.queue(events.event0);
    return pr;
  });

  test('should transition thred and receive both response and notification', async function () {
    const pr = new Promise<void>((resolve, reject) => {
      let messagesReceived = 0;
      let transitionResponseReceived = false;
      let notificationReceived = false;
      const checkCompletion = () => transitionResponseReceived && notificationReceived && resolve();
      engineConnMan.engine.dispatchers = [
        withReject(async (message: Message) => {
          messagesReceived++;
          if (message.event.thredId === thredId) {
            Logger.debug(`Received transition response: ${JSON.stringify(message.event)}`);
            transitionResponseReceived = true;
            checkCompletion();
          } else if (
            message.event.type === 'org.wt.tell' &&
            addressToArray(message.to).includes(adminTestSource.id) &&
            Events.valueNamed(message.event, 'threds')
          ) {
            Logger.debug(`Received notification: ${JSON.stringify(message.event)}`);
            // Check for notification event - this is
            expect(message.event.re).toBe(watchEventId);
            const threds = Events.valueNamed(message.event, 'threds');
            expect(threds).toBeDefined();
            expect(threds).toBeDefined();
            expect(threds.length).toBeGreaterThan(0);
            expect(threds[0].status).toBe('a'); // active
            expect(threds[0].currentReaction.reactionName).toBe('event2Reaction');
            notificationReceived = true;
            checkCompletion();
            // Check for transition response
          }
          if (messagesReceived > 2) {
            reject(
              new Error(
                `Too many messages received without finding expected notification. Last message: ${JSON.stringify(message)}`,
              ),
            );
          }
        }, reject),
      ];
    });
    engineConnMan.eventQ.queue({ ...events.event1, thredId });
    return pr;
  });

  test('should successfully renew thred notifications using watchThreds with renew directive', async function () {
    const renewEvent = SystemEvents.getWatchThredsEvent(adminTestSource, 'renew');
    const pr = withDispatcherPromise(engineConnMan.engine.dispatchers, (message: Message) => {
      expect(message.event.type).toBe('org.wt.tell');
      expect(message.event.re).toBe(renewEvent.id);
      expect(Events.assertSingleValues(message.event).status).toBe(systemEventTypes.successfulStatus);
      expect(Events.assertSingleValues(message.event).op).toBe(systemEventTypes.operations.watchThreds);
      expect(Events.assertSingleValues(message.event).directive).toBe('renew');
    });

    engineConnMan.eventQ.queue(renewEvent);
    return pr;
  });

  test('should successfully unsubscribe from thred notifications using watchThreds with stop directive', async function () {
    const unsubscribeEvent = SystemEvents.getWatchThredsEvent(adminTestSource, 'stop');
    const pr = withDispatcherPromise(engineConnMan.engine.dispatchers, (message: Message) => {
      expect(message.event.type).toBe('org.wt.tell');
      expect(message.event.re).toBe(unsubscribeEvent.id);
      expect(Events.assertSingleValues(message.event).status).toBe(systemEventTypes.successfulStatus);
      expect(Events.assertSingleValues(message.event).op).toBe(systemEventTypes.operations.watchThreds);
      expect(Events.assertSingleValues(message.event).directive).toBe('stop');
    });

    engineConnMan.eventQ.queue(unsubscribeEvent);
    return pr;
  });

  afterAll(async () => {
    await engineConnMan.purgeAll();
    await engineConnMan.disconnectAll();
  });
});

let engineConnMan: EngineConnectionManager;
let thredId: string | undefined;
let watchEventId: string | undefined;
