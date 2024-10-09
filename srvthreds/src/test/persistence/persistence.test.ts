import { Logger, LoggerLevel } from '../../ts/thredlib/index.js';
import { Persistence } from '../../ts/persistence/Persistence.js';
import { MongoPersistence } from '../../ts/persistence/mongodb/MongoPersistence.js';

Logger.setLevel(LoggerLevel.INFO);

describe('persistence', function () {
  test('connect', async function () {
    persistence = new MongoPersistence();
    await persistence.connect();
  });
  // objects
  test('simple save', async function () {
    await persistence.create({ type: testObjType, values: testObj1 });
  });
  test('save should fail becuase of dup id', async function () {
    try {
      await persistence.create({ type: testObjType, values: testObj1 });
    } catch (e) {
      expect(e).toBeTruthy();
    }
  });
  test('simple find', async function () {
    const obj = await persistence.findOne({
      type: testObjType,
      matcher: { id: testObjId },
    });
    expect(obj.testkey).toBe('testvalue');
  });
  test('simple update', async function () {
    await persistence.update({
      type: testObjType,
      matcher: { id: testObjId },
      values: { testkey: 'updated_testvalue' },
    });
  });
  test('find updated value', async function () {
    const obj = await persistence.findOne({
      type: testObjType,
      matcher: { id: testObjId },
    });
    expect(obj.testkey).toBe('updated_testvalue');
  });
  test('simple replace', async function () {
    await persistence.replace({
      type: testObjType,
      matcher: { id: testObjId },
      values: { testkey: 'replace_testvalue' },
    });
  });
  test('find replaced value', async function () {
    const obj = await persistence.findOne({
      type: testObjType,
      matcher: { id: testObjId },
    });
    expect(obj.testkey).toBe('replace_testvalue');
  });
  test('simple delete', async function () {
    await persistence.delete({ type: testObjType, matcher: { id: testObjId } });
  });
  test('shouldnt find deleted value', async function () {
    const obj = await persistence.findOne({
      type: testObjType,
      matcher: { id: testObjId },
    });
    expect(obj).toBeNull();
  });
  test('simple replace (doc not there) expecting upsert', async function () {
    await persistence.replace({
      type: testObjType,
      matcher: { id: testObjId },
      values: { testkey: 'replace_testvalue' },
    });
  });
  test('find replaced value', async function () {
    const obj = await persistence.findOne({
      type: testObjType,
      matcher: { id: testObjId },
    });
    expect(obj.testkey).toBe('replace_testvalue');
  });
  test('delete replace value', async function () {
    await persistence.delete({ type: testObjType, matcher: { id: testObjId } });
  });
  test('save multiple', async function () {
    const docs = [];
    for (let i = 0; i < 100; i++) {
      docs.push({
        id: `TEST_ID_${i}`,
        testkey: `testvalue${i}`,
        testArray: [`testarrayitem${i}`],
        testNumeric: i,
      });
    }
    await persistence.create({ type: testObjType, values: docs });
  });
  test('find gte', async function () {
    const obj = await persistence.findOne({
      type: testObjType,
      matcher: { testNumeric: { $gte: 50 } },
    });
    expect(obj.id).toBe(`TEST_ID_50`);
  });
  test('find many gte', async function () {
    const obj = await persistence.find({
      type: testObjType,
      matcher: { testNumeric: { $gte: 50 } },
    });
    expect(Array.isArray(obj)).toBe(true);
    expect(obj.length).toBe(50);
  });
  test('find many no match', async function () {
    const obj = await persistence.find({
      type: testObjType,
      matcher: { testNumeric: { $gte: 100 } },
    });
    expect(Array.isArray(obj)).toBe(true);
    expect(obj.length).toBe(0);
  });
  test('find many lt', async function () {
    const obj = await persistence.find({
      type: testObjType,
      matcher: { testNumeric: { $lt: 10 } },
    });
    expect(Array.isArray(obj)).toBe(true);
    expect(obj.length).toBe(10);
  });
  test('find or', async function () {
    const obj = await persistence.findOne({
      type: testObjType,
      matcher: { $or: [{ testNumeric: 200 }, { testNumeric: 50 }] },
    });
    expect(obj.id).toBe(`TEST_ID_50`);
  });
  test('find many or', async function () {
    const obj = await persistence.find({
      type: testObjType,
      matcher: { $or: [{ testNumeric: 10 }, { testNumeric: 50 }] },
    });
    expect(Array.isArray(obj)).toBe(true);
    expect(obj.length).toBe(2);
  });
  test('find in', async function () {
    const obj = await persistence.findOne({
      type: testObjType,
      matcher: { testArray: { $in: ['testarrayitem10'] } },
    });
    expect(obj.id).toBe(`TEST_ID_10`);
  });
  test('find many in', async function () {
    const obj = await persistence.find({
      type: testObjType,
      matcher: {
        $or: [
          { testArray: { $in: ['testarrayitem70'] } },
          { testArray: { $in: ['testarrayitem10'] } },
        ],
      },
    });
    expect(Array.isArray(obj)).toBe(true);
    expect(obj.length).toBe(2);
    expect([...obj[0].testArray, ...obj[1].testArray]).toContain(
      'testarrayitem70'
    );
    expect([...obj[0].testArray, ...obj[1].testArray]).toContain(
      'testarrayitem10'
    );
  });
  test('update many', async function () {
    const obj = await persistence.update({
      type: testObjType,
      matcher: { testNumeric: { $gte: 50 } },
      values: { $add: { testArray: 'newtestarrayitm' } },
    });
  });
  test('count', async function () {
    const obj = await persistence.count({
      type: testObjType,
      matcher: { testNumeric: { $gte: 90 } },
    });
    expect(obj).toBe(10);
  });
  test('delete many', async function () {
    await persistence.delete({ type: testObjType, matcher: {} });
  });
  // cleanup in case of failure
  afterAll(async () => {
    try {
      await (persistence as MongoPersistence).removeDatabase();
    } catch (e) {
      Logger.error(`Cleanup Failed ${(e as Error).message}`);
    }
    await persistence.disconnect();
  });
});

const testObjId = 'TEST_ID';
const testObjId2 = 'TEST_ID_2';
const testObjType = 'TestType';
const testObj1 = { id: testObjId, testkey: 'testvalue' };
const testObj2 = { id: testObjId2, testkey2: 'testvalue2' };
const setId = 'TEST_SET_ID';
const setType = 'SET_TYPE';
const setItems = ['setItem0', 'setItem1'];

let persistence: Persistence;
