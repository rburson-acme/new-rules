import { createClient } from 'redis';
import { Logger, LoggerLevel, StringMap, Timers } from '../../ts/thredlib/index.js';
import Redlock, { Lock } from '../../ts/storage/Redlock.js';
import { delay } from '../testUtils.js';

Logger.setLevel(LoggerLevel.INFO);

describe('redis test', function () {
  beforeAll(async () => {
    client = await newRedisClient();
    client.on('error', function (error: any) {
      Logger.error(error);
    });
    client.on('ready', function () {
      /* Logger.info('Ready'); */
    });
    client.on('reconnecting', function () {
      Logger.info('Reconnecting...');
    });
    client.on('end', function () {});
    /*
        Adjust retryCount and retry delay upwards if too many clients are failing to acquire the same locked object
    */
    redlock = new Redlock([client], {
      // the expected clock drift; for more details, see http://redis.io/topics/distlock
      driftFactor: 0.01, // time in ms
      // the max number of times Redlock will attempt to lock a resource before erroring
      retryCount: 50,
      // the time in ms between attempts
      retryDelay: 100,
      // see https://www.awsarchitectureblog.com/2015/03/backoff.html
      retryJitter: 200, // time in ms
    });
    redlock.on('clientError', function (err: any) {
      Logger.error('A redis error has occurred:', err);
    });
    await client.flushDb();

    /*
    const subClient = await newRedisClient();
    subClient.config('SET', 'notify-keyspace-events', 'K$');
    await subClient.psubscribe('__key*__:*');
    subClient.on(`pmessage`, (_pattern, redisKey, redisOpeation) => {
      console.log(`there was an operation on ${redisKey}: ${redisOpeation}`);
    });
    */
  });
  test('save and claim w/ quick release', async function () {
    const id = testObjId;
    const item = testObj1;
    const lock = await redlock.acquire([`lock${id}`], 100);
    locks[id] = lock;
    const multi = client.multi();
    const data = JSON.stringify(item);
    multi.set(id, data);
    await multi.exec();
  });
  test('test lock already released', async function () {
    await delay(200);
    const clock = Timers.clock().start();
    const id = testObjId;
    const item = testObj1;
    const lock = locks[id];
    if (!lock) throw Error(`lock does not exist for ${id}`);
    const multi = client.multi();
    const data = JSON.stringify(item);
    multi.set(id, data);
    await multi.exec();
    await expect(
      redlock.release(lock, {
        retryCount: 3,
      }),
    ).rejects.toBeTruthy();
    delete locks[id];
  });
  afterAll(async () => {
    await client.flushDb();
    await client.quit();
  });
});

const newRedisClient = async () => {
  const client = createClient({
    socket: {
      reconnectStrategy: (retries) => {
        const delay = Math.min(retries * 50, 2000);
        return delay;
      },
    },
  });

  await client.connect();
  return client;
};

let client: any; // Use any to avoid Redis client type conflicts between versions
let redlock: Redlock;
let locks: StringMap<Lock> = {};

const testObjId = 'TEST_ID';
const testObjId2 = 'TEST_ID_2';
const testObjType = 'TestType';
const testObj1 = { testkey: 'testvalue' };
const testObj2 = { testkey2: 'testvalue2' };
const setId = 'TEST_SET_ID';
const setType = 'SET_TYPE';
const setItems = ['setItem0', 'setItem1'];
