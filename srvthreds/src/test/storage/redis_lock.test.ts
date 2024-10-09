import { Logger, LoggerLevel, Timers } from '../../ts/thredlib/index.js';
import { RedisStorage } from '../../ts/storage/RedisStorage.js';
import { Lock, Storage, indexId } from '../../ts/storage/Storage.js';
import { delay } from '../testUtils.js';

Logger.setLevel(LoggerLevel.INFO);

describe('redis locks', function () {
  test('connect', function () {
    storage = new RedisStorage();
    storage.purgeAll();
  });
  test('should save object', function () {
    return storage.save(testObjType, testObj1, testObjId);
  });
  // run set of promises simulteneously that modify an array
  test('should claim and release in sequence without race condition', async function () {
    for (let j = 0; j < 100; j++) {
      await lockAndRelease(j, testObjType, testObjId);
    }
    return;
  });
  // all items should be present
  test('should retrieve updated entry', async function () {
    const result = await storage.retrieve(testObjType, testObjId);
    expect((<any>result).visitors.length).toBe(100);
    for (let j = 0; j < 100; j++) {
      expect((<any>result).visitors[j]).toBe(j);
    }
  });
  //this one's tricky - the second 'saveAndClaim' call here should 'wait' until the first
  // lock aquisition has been released (at the end of this function)
  test('should save and claim and release in sequence without race condition', async function () {
    const { lock } = await storage.saveAndClaim(testObjType, testObj2, testObjId2);
    const pr =
    [storage.saveAndClaim(testObjType, testObj2, testObjId2).then(({ lock }) => {
      return storage.saveAndRelease( lock, testObjType, { ...testObj2, visitors: ['should be last'] }, testObjId2,);
    })];
    await delay(500);
    pr.push(storage.saveAndRelease( lock, testObjType, { ...testObj2, visitors: ['should be first'] }, testObjId2,));
    return Promise.all(pr);
  });
  // expect a synchronized result
  test('should retrieve updated entry', async function () {
    const result = await storage.retrieve(testObjType, testObjId2);
    expect((<any>result).visitors[0]).toBe('should be last');
  });
  test('release should throw if lock is has already timed', async function () {
    const { result, lock } = await storage.claim(testObjType, testObjId2, 100);
    await delay(200);
    return expect(storage.saveAndRelease(lock, testObjType, result, testObjId2)).rejects.toThrow();
  });
  test('lock should renew successfully', async function () {
    const { result, lock } = await storage.claim(testObjType, testObjId2, 100);
    await delay(50);
    await storage.renewClaim(lock, 200);
    await delay(100);
    return await expect(
      storage.saveAndRelease(lock, testObjType, result, testObjId2)).resolves.toBeUndefined();
  });
  test('lock, release, and delete in sequence without race condition', async function () {
    const { lock } = await storage.saveAndClaim(testObjType, testObj2, testObjId2);
    const pr = [delay(100).then(() =>
      storage.saveAndRelease(lock, testObjType, testObj2, testObjId2),
    )];
    pr.push(storage.claimAndDelete(testObjType, testObjId2));
    return Promise.all(pr);
  });
  test('should have deleted entry', async function () {
    const result = await storage.exists(testObjType, testObjId2);
    expect(result).toBe(false);
  });
  test('lock, delete, release in sequence WITH race condition', async function () {
    const { lock } = await storage.saveAndClaim(testObjType, testObj2, testObjId2);
    return Promise.all([
      delay(100).then(() =>
        storage.saveAndRelease(lock, testObjType, testObj2, testObjId2),
      ),
      storage.delete(testObjType, testObjId2)
    ]);
  });
  test('should not have deleted entry', async function () {
    const result = await storage.exists(testObjType, testObjId2);
    expect(result).toBe(true);
  });
    test('should add to set', function () {
        const ops = new Array<Promise<void>>();
        for(let j = 0; j < 100; j++) {
            ops.push(storage.addToSet(setType, 'item_' + j, setId));
        }
        return Promise.all(ops);
    });
    test('count set', async function () {
        const result = await storage.setCount(setType, setId);
        expect(result).toBe(100);
    })
    test('should remove from set w/ lock', function () {
        const ops = new Array<Promise<void>>();
        for(let j = 0; j < 100; j++) {
            ops.push(storage.removeFromSetWithLock(setType, 'item_' + j, setId));
        }
        return Promise.all(ops);
    });
    test('set should not still exist', async function () {
        const result = await storage.exists(setType, setId);
        expect(result).toBe(false);
    });
    test('set type index should not still exist', async function () {
        const result = await storage.exists(setType, indexId);
        expect(result).toBe(false);
    });
    test('should add and remove from set', function () {
        const ops = new Array<Promise<void>>();
        for(let j = 0; j < 100; j++) {
            ops.push(storage.addToSet(setType, 'item_' + j, setId));
            ops.push(storage.removeFromSetWithLock(setType, 'item_' + j, setId));
        }
        return Promise.all(ops);
    });
    test('set should not still exist', async function () {
        const result = await storage.exists(setType, setId);
        expect(result).toBe(false);
    });
    test('set type index should not still exist', async function () {
        const result = await storage.exists(setType, indexId);
        expect(result).toBe(false);
    });

  // cleanup in case of failure
  afterAll(async () => {
    await storage.purgeAll();
    await storage.disconnect();
  });
});

const lockAndRelease = (iteration: number, type: string, id: string): Promise<void> => {
  return storage.claim(type, id).then(({ result, lock}) => {
    result.visitors.push(iteration);
    return storage.saveAndRelease(lock, type, result, id);
  });
};

const testObjId = 'TEST_ID';
const testObjId2 = 'TEST_ID_2';
const testObjType = 'TestType';
const testObj1 = { testkey: 'testvalue', visitors: [], counter: 0 };
const testObj2 = { testkey2: 'testvalue2', visitors: [], counter: 0 };
const setId = 'TEST_SET_ID';
const setType = 'SET_TYPE';

let storage: Storage;
let lock: Lock;
