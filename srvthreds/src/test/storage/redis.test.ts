import { Redis } from 'ioredis';
import { Logger, LoggerLevel, StringMap, Timers } from '../../ts/thredlib/index.js';
import Redlock, { Lock } from 'redlock';
import { delay } from '../testUtils.js';

Logger.setLevel(LoggerLevel.INFO);

describe('redis storage', function () {
  beforeAll(async () => {
    client = await newRedisClient();
    client.on('error', function (error) {
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
        Adjust retryCount and retry delay upwards if too many clients are failing to aquire the same locked object
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
    redlock.on('clientError', function (err) {
      Logger.error('A redis error has occurred:', err);
    });
    await client.flushdb();

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
  test('', async function () {
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
    await client.flushdb();
    await client.quit().then((resp) => undefined);
  });
});

const newRedisClient = async () => {
    const client = new Redis({
      // This is the default value of `retryStrategy`
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });
    return client;
}

let client: Redis;
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
