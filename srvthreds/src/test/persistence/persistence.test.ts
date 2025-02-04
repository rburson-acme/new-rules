import { Logger, LoggerLevel } from '../../ts/thredlib/index.js';
import { Persistence } from '../../ts/persistence/Persistence.js';
import { MongoPersistenceProvider } from '../../ts/persistence/mongodb/MongoPersistenceProvider.js';
import { PersistenceProvider } from '../../ts/provider/PersistenceProvider.js';
import { MongoPersistence } from '../../ts/persistence/mongodb/MongoPersistence.js';

Logger.setLevel(LoggerLevel.INFO);

describe('persistence', function () {
  test('connect', async function () {
    persistenceProvider = new MongoPersistenceProvider();
    await persistenceProvider.connect();
    persistence = persistenceProvider.getInstance();
  });
  // objects
  test('simple save', async function () {
    await persistence.put({ type: testObjType, values: testObj1 });
  });
  test('save should fail becuase of dup id', async function () {
    try {
      await persistence.put({ type: testObjType, values: testObj1 });
    } catch (e) {
      expect(e).toBeTruthy();
    }
  });
  test('simple find', async function () {
    const obj = await persistence.getOne({
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
    const obj = await persistence.getOne({
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
    const obj = await persistence.getOne({
      type: testObjType,
      matcher: { id: testObjId },
    });
    expect(obj.testkey).toBe('replace_testvalue');
  });
  test('simple delete', async function () {
    await persistence.delete({ type: testObjType, matcher: { id: testObjId } });
  });
  test('shouldnt find deleted value', async function () {
    const obj = await persistence.getOne({
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
    const obj = await persistence.getOne({
      type: testObjType,
      matcher: { id: testObjId },
    });
    expect(obj.testkey).toBe('replace_testvalue');
  });
  test('delete replace value', async function () {
    await persistence.delete({ type: testObjType, matcher: { id: testObjId } });
  });
  test('upsert (doc not there)', async function () {
    await persistence.upsert({
      type: testObjType,
      matcher: { id: testObjId },
      values: { testkey: 'upsert_testvalue' },
    });
  });
  test('find upsert value', async function () {
    const obj = await persistence.getOne({
      type: testObjType,
      matcher: { id: testObjId },
    });
    expect(obj.testkey).toBe('upsert_testvalue');
  });
  test('upsert (doc already there)', async function () {
    await persistence.upsert({
      type: testObjType,
      matcher: { id: testObjId },
      values: { testkey: 'upsert_again' },
    });
  });
  test('find upsert value', async function () {
    const obj = await persistence.getOne({
      type: testObjType,
      matcher: { id: testObjId },
    });
    expect(obj.testkey).toBe('upsert_again');
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
    await persistence.put({ type: testObjType, values: docs });
  });
  test('find gte', async function () {
    const obj = await persistence.getOne({
      type: testObjType,
      matcher: { testNumeric: { $gte: 50 } },
    });
    expect(obj.id).toBe(`TEST_ID_50`);
  });
  test('find many gte', async function () {
    const obj = await persistence.get({
      type: testObjType,
      matcher: { testNumeric: { $gte: 50 } },
    });
    expect(Array.isArray(obj)).toBe(true);
    expect(obj.length).toBe(50);
  });
  test('find regex', async function () {
    const obj = await persistence.get({
      type: testObjType,
      matcher: { testkey: { $re: '.*estvalue5.*' } },
    });
    expect(obj.length).toBe(11);
  });
  test('find many no match', async function () {
    const obj = await persistence.get({
      type: testObjType,
      matcher: { testNumeric: { $gte: 100 } },
    });
    expect(Array.isArray(obj)).toBe(true);
    expect(obj.length).toBe(0);
  });
  test('find many lt', async function () {
    const obj = await persistence.get({
      type: testObjType,
      matcher: { testNumeric: { $lt: 10 } },
    });
    expect(Array.isArray(obj)).toBe(true);
    expect(obj.length).toBe(10);
  });
  test('find or', async function () {
    const obj = await persistence.getOne({
      type: testObjType,
      matcher: { $or: [{ testNumeric: 200 }, { testNumeric: 50 }] },
    });
    expect(obj.id).toBe(`TEST_ID_50`);
  });
  test('find many or', async function () {
    const obj = await persistence.get({
      type: testObjType,
      matcher: { $or: [{ testNumeric: 10 }, { testNumeric: 50 }] },
    });
    expect(Array.isArray(obj)).toBe(true);
    expect(obj.length).toBe(2);
  });
  test('find in', async function () {
    const obj = await persistence.getOne({
      type: testObjType,
      matcher: { testArray: { $in: ['testarrayitem10'] } },
    });
    expect(obj.id).toBe(`TEST_ID_10`);
  });
  test('find many in', async function () {
    const obj = await persistence.get({
      type: testObjType,
      matcher: {
        $or: [{ testArray: { $in: ['testarrayitem70'] } }, { testArray: { $in: ['testarrayitem10'] } }],
      },
    });
    expect(Array.isArray(obj)).toBe(true);
    expect(obj.length).toBe(2);
    expect([...obj[0].testArray, ...obj[1].testArray]).toContain('testarrayitem70');
    expect([...obj[0].testArray, ...obj[1].testArray]).toContain('testarrayitem10');
  });
  test('sort results', async function () {
    const obj = await persistence.get({
      type: testObjType,
      matcher: {},
      collector: { sort: [{ field: 'testNumeric', desc: true }] },
    });
    expect(obj.length).toBe(100);
    expect(obj[0].testNumeric).toBe(99);
  });
  test('page results', async function () {
    const obj = await persistence.get({
      type: testObjType,
      matcher: {},
      collector: { sort: [{ field: 'testNumeric', desc: true }], limit: 10, skip: 90 },
    });
    expect(obj.length).toBe(10);
    expect(obj[0].testNumeric).toBe(9);
  });
  test('query with selectors', async function () {
    const obj = await persistence.get({
      type: testObjType,
      matcher: {},
      collector: { sort: [{ field: 'testNumeric' }], limit: 10},
      selector: { include: ['testNumeric'] },
    });
    expect(obj.length).toBe(10);
    expect(Object.keys(obj[0]).length).toBe(2);
    expect(obj[0].testNumeric).toBeDefined();
    expect(obj[0].id).toBeDefined();
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
      await persistence.deleteDatabase();
    } catch (e) {
      Logger.error(`Cleanup Failed ${(e as Error).message}`);
    }
    await persistenceProvider.disconnect();
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
let persistenceProvider: PersistenceProvider;
