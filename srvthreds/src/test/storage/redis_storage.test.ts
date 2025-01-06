import { Logger, LoggerLevel } from '../../ts/thredlib/index.js';
import { RedisStorage } from '../../ts/storage/RedisStorage.js';
import { Storage, indexId } from '../../ts/storage/Storage.js';

Logger.setLevel(LoggerLevel.INFO);

describe('redis storage', function () {
  test('connect', function () {
    storage = new RedisStorage();
    storage.purgeAll();
  });
  // objects
  test('save', function () {
    return storage.save(testObjType, testObj1, testObjId, testMeta1);
  });
  test('exists', async function () {
    const result = await storage.exists(testObjType, testObjId);
    expect(result).toBe(true);
  });
  test('retrieve entry', async function () {
    const result = await storage.retrieve(testObjType, testObjId);
    expect((<any>result).testkey).toBe('testvalue');
  });
  test('should have also created index for type', async function () {
    const result = await storage.retrieveSet(testObjType, indexId);
    expect(result).toContain(testObjId);
  });
  test('save another object of type', function () {
    return storage.save(testObjType, testObj2, testObjId2);
  });
  test('retrieve entry', async function () {
    const result = await storage.retrieve(testObjType, testObjId2);
    expect((<any>result).testkey2).toBe('testvalue2');
  });
  test('should have also updated index for type', async function () {
    const result = await storage.retrieveSet(testObjType, indexId);
    expect(result?.length).toBe(2);
    expect(result).toContain(testObjId);
    expect(result).toContain(testObjId2);
  });
  test('retrieve all', async function () {
    const result = await storage.retrieveAll(testObjType, [testObjId, testObjId2]);
    expect(result.length).toBe(2);
    expect(result[0].testkey).toBe('testvalue');
    expect(result[1].testkey2).toBe('testvalue2');
  });

  //Sets
  test('add to set', function () {
    return storage.addToSet(setType, setItems[0], setId);
  });
  test('should be in set', async function () {
    const result = await storage.setContains(setType, setItems[0], setId);
    expect(result).toBe(true);
  });
  test('should not be in set', async function () {
    const result = await storage.setContains(setType, setItems[1], setId);
    expect(result).toBe(false);
  });
  test('add more to set', function () {
    return storage.addToSet(setType, setItems[1], setId);
  });
  test('should be in set', async function () {
    const result = await storage.setContains(setType, setItems[1], setId);
    expect(result).toBe(true);
  });
  test('count set', async function () {
    const result = await storage.setCount(setType, setId);
    expect(result).toBe(2);
  });
  test('retrieve set', async function () {
    const result = await storage.retrieveSet(setType, setId);
    expect(result).toContain(setItems[0]);
    expect(result).toContain(setItems[1]);
    expect(result?.length).toBe(2);
  });
  test('should have also created index for set', async function () {
    const result = await storage.retrieveSet(setType, indexId);
    expect(result).toContain(setId);
  });
  test('remove item from set', function () {
    return storage.removeFromSet(setType, setItems[1], setId);
  });
  test('should not be in set', async function () {
    const result = await storage.setContains(setType, setItems[1], setId);
    expect(result).toBe(false);
  });
  test('count set', async function () {
    const result = await storage.setCount(setType, setId);
    expect(result).toBe(1);
  });
  test('set type index should still exist', async function () {
    const result = await storage.exists(setType, indexId);
    expect(result).toBe(true);
  });
  test('remove last item from set', function () {
    return storage.removeFromSet(setType, setItems[0], setId);
  });
  test('set should not still exist', async function () {
    const result = await storage.exists(setType, setId);
    expect(result).toBe(false);
  });
  test('set type index should not still exist', async function () {
    const result = await storage.exists(setType, indexId);
    expect(result).toBe(false);
  });
  test('set should return empty string[]', async function () {
    const result = await storage.retrieveSet(setType, setId);
    expect(result.length).toBe(0);
  });
  test('recreateSet', async function () {
    await storage.addToSet(setType, setItems[0], setId);
    await storage.addToSet(setType, setItems[1], setId);
  });
  test('delete object 1', async function () {
    await storage.delete(testObjType, testObjId);
  });
  test('object type index should still exist', async function () {
    const result = await storage.exists(testObjType, indexId);
    expect(result).toBe(true);
  });
  test('retrieve no entry', async function () {
    const result = await storage.retrieve(testObjType, testObjId);
    expect(result).toBeUndefined;
  });
  test('delete object 2', async function () {
    await storage.delete(testObjType, testObjId2);
  });
  test('object type 2 should not still exist', async function () {
    const result = await storage.exists(testObjType, testObjId2);
    expect(result).toBe(false);
  });
  test('object type index should not still exist', async function () {
    const result = await storage.exists(testObjType, indexId);
    expect(result).toBe(false);
  });
  test('delete set', async function () {
    await storage.deleteSet(setType, setId);
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

const testObjId = 'TEST_ID';
const testObjId2 = 'TEST_ID_2';
const testObjType = 'TestType';
const testMeta1 = { timestamp: 'now' };
const testObj1 = { testkey: 'testvalue' };
const testObj2 = { testkey2: 'testvalue2' };
const setId = 'TEST_SET_ID';
const setType = 'SET_TYPE';
const setItems = ['setItem0', 'setItem1'];

let storage: Storage;
