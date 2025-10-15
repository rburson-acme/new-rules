import { Logger, LoggerLevel, Event, StringMap, Message } from '../../ts/thredlib/index.js';
import { events } from '../testUtils.js';
import { RemoteQService } from '../../ts/queue/remote/RemoteQService.js';
import { QMessage } from '../../ts/queue/QService.js';
import config from './rascal_test_config.json' with { type: 'json' };
import { RemoteQBroker } from '../../ts/queue/remote/RemoteQBroker.js';
import { RascalConfig } from '../../ts/config/RascalConfig.js';

Logger.setLevel(LoggerLevel.INFO);

describe('amqp connection', function () {
  beforeAll(async () => {
    qBroker = new RemoteQBroker(new RascalConfig(config));
    await qBroker.connect();
    await qBroker.deleteAll().catch(Logger.error);
  });
  test('connect', async function () {
    eventPubService = await RemoteQService.newInstance<Event>({
      qBroker,
      pubName: 'pub_event',
    });
    eventSubService = await RemoteQService.newInstance<Event>({
      qBroker,
      subNames: ['sub_event'],
    });
    messagePubService = await RemoteQService.newInstance<Message>({
      qBroker,
      pubName: 'pub_message',
    });
    messageSubService = await RemoteQService.newInstance<Message>({
      qBroker,
      subNames: ['sub_session_message', 'sub_session1_message'],
    });
  });
  test('queue 1000', function () {
    const results = new Array<Promise<void>>();
    for (let i = 0; i < 500; i++) {
      results.push(eventPubService.queue({ id: `test${i}`, payload: events.event0 }));
    }
    for (let i = 0; i < 500; i++) {
      results.push(
        messagePubService.queue({
          id: `test${i}`,
          payload: {
            id: `test${i}`,
            to: ['particpant0'],
            event: events.event0,
          },
          topics: ['org.wt.session1'],
        }),
      );
    }
    return Promise.all(results);
  });
  test('pop events', async function () {
    const resultMap: StringMap<boolean> = {};
    for (let i = 0; i < 500; i++) {
      const message: QMessage<Event> = await eventSubService.pop();
      expect(resultMap[message.id]).toBe(undefined);
      expect(message.payload.id).toBe(events.event0.id);
      resultMap[message.id] = true;
      await eventSubService.delete(message);
    }
    for (let i = 0; i < 500; i++) {
      expect(resultMap[`test${i}`]).toBe(true);
    }
  });
  test('pop messages', async function () {
    const resultMap: StringMap<boolean> = {};
    for (let i = 0; i < 500; i++) {
      const message: QMessage<Message> = await messageSubService.pop();
      expect(resultMap[message.id]).toBe(undefined);
      expect(message.payload.event.id).toBe(events.event0.id);
      resultMap[message.id] = true;
      await messageSubService.delete(message);
    }
    for (let i = 0; i < 500; i++) {
      expect(resultMap[`test${i}`]).toBe(true);
    }
  });
  test('queue 2', async function () {
    // we have to turn off the subscribers so messages are not getting queued and unacknowledged
    // Note: if there are unack'd messages unsubscribeAll and shutdown will block indefinitely
    await qBroker.unsubscribeAll().catch(Logger.error);
    const results = new Array<Promise<void>>();
    for (let i = 0; i < 100; i++) {
      results.push(eventPubService.queue({ id: `test${i}`, payload: events.event0 }));
    }
    return Promise.all(results);
  });
  test('disconnect before consuming all messages', async function () {
    // Note: if there are unack'd messages unsubscribeAll and shutdown will block indefinitely
    await qBroker.disconnect().catch(Logger.error);
  });
  test('reconnect', async function () {
    await qBroker.connect();
    eventPubService = await RemoteQService.newInstance<Event>({
      qBroker,
      pubName: 'pub_event',
    });
    eventSubService = await RemoteQService.newInstance<Event>({
      qBroker,
      subNames: ['sub_event'],
    });
  });
  test('pop', async function () {
    const resultMap: StringMap<boolean> = {};
    for (let i = 0; i < 100; i++) {
      const message: QMessage<Event> = await eventSubService.pop();
      expect(resultMap[message.id]).toBe(undefined);
      expect(message.payload.id).toBe(events.event0.id);
      resultMap[message.id] = true;
      await eventSubService.delete(message);
    }
    for (let i = 0; i < 100; i++) {
      expect(resultMap[`test${i}`]).toBe(true);
    }
  });
  afterAll(async () => {
    await qBroker.deleteAll().catch(Logger.error);
    // Note: if there are unack'd messages unsubscribeAll and shutdown will block indefinitely
    await qBroker.disconnect().catch(Logger.error);
  });
});

let eventPubService: RemoteQService<Event>;
let eventSubService: RemoteQService<Event>;
let messagePubService: RemoteQService<Message>;
let messageSubService: RemoteQService<Message>;
let qBroker: RemoteQBroker;
