import { Logger, LoggerLevel, Event, SMap, EventBuilder, Events, EventThrowable } from '../../ts/thredlib/index.js';
import { AgentQueueConnectionManager, withPromiseHandlers } from '../testUtils.js';
import agentConfig from '../../ts/config/persistence_agent.json';
import { Agent } from '../../ts/agent/Agent.js';
import { PersistenceAgent } from '../../ts/agent/persistence/PersistenceAgent.js';
import { PersistenceFactory } from '../../ts/persistence/PersistenceFactory.js';
import { Operations } from '../../ts/thredlib/task/Operations.js';
import { AgentConfig } from '../../ts/agent/Config.js';

// set the agent implementation directly (vitest has a problem with dynamic imports)
const persistenceAgentConfig = agentConfig as AgentConfig;
persistenceAgentConfig.agentImpl = PersistenceAgent;

Logger.setLevel(LoggerLevel.DEBUG);

describe('persistence agent test', function () {
  beforeAll(async () => {
    connMan = await AgentQueueConnectionManager.newAgentInstance('persistence_agent', persistenceAgentConfig);
    await connMan.purgeAll();
    agent = connMan.agent;
  });
  test('test store object', async function () {
    const pr = new Promise((resolve, reject) => {
      agent.eventPublisher.publishEvent = withPromiseHandlers(
        (event: Event) => {
          expect(event.type).toBe('org.wt.persistence');
          expect(event.data?.content?.values).toBeTruthy();
          expect(event.data?.content?.error).toBeUndefined();
          // should return id as result if successful
          expect(Events.valueNamed(event, 'result')).contains('object_test');
        },
        resolve,
        reject,
      );
    });
    agent.processMessage({ event: storeObjectEvent, to: ['org.wt.persistence'], id: 'test' });
    return pr;
  });
  test('test find object', async function () {
    const pr = new Promise((resolve, reject) => {
      agent.eventPublisher.publishEvent = withPromiseHandlers(
        (event: Event) => {
          expect(event.type).toBe('org.wt.persistence');
          // this is an example of a task structured as a transaction - noticed the nested array result
          // see the event below for more details
          expect(Events.valueNamed(event, 'result')[0][0].name).toBe('Object Test');
          expect(event.data?.content?.error).toBeUndefined();
        },
        resolve,
        reject,
      );
    });
    agent.processMessage({ event: findObjectEvent, to: ['org.wt.persistence'], id: 'test' });
    return pr;
  });
  test('test store object should fail w/ duplicate', async function () {
    try {
      await agent.processMessage({ event: storeObjectEvent, to: ['org.wt.persistence'], id: 'test' });
    } catch (e) {
      expect(e).toBeInstanceOf(EventThrowable);
      expect((<EventThrowable>e).message).toContain('PersistenceAgent: Error processing message');
    }
  });
  test('test update object', async function () {
    const pr = new Promise((resolve, reject) => {
      agent.eventPublisher.publishEvent = withPromiseHandlers(
        (event: Event) => {
          expect(event.type).toBe('org.wt.persistence');
          // update returns undefined
          expect(event.data?.content?.values).toBeTruthy();
          expect(event.data?.content?.error).toBeUndefined();
        },
        resolve,
        reject,
      );
    });
    agent.processMessage({ event: updateObjectEvent, to: ['org.wt.persistence'], id: 'test' });
    return pr;
  });
  test('test find object', async function () {
    const pr = new Promise((resolve, reject) => {
      agent.eventPublisher.publishEvent = withPromiseHandlers(
        (event: Event) => {
          expect(event.type).toBe('org.wt.persistence');
          // this is an example of a task structured as a transaction - noticed the nested array result
          // see the event below for more details
          expect(Events.valueNamed(event, 'result')[0][0].testItems[0].name).toBe('first testItem renamed');
          expect(event.data?.content?.error).toBeUndefined();
        },
        resolve,
        reject,
      );
    });
    agent.processMessage({ event: findObjectEvent, to: ['org.wt.persistence'], id: 'test' });
    return pr;
  });
  test('test upsert object', async function () {
    const pr = new Promise((resolve, reject) => {
      agent.eventPublisher.publishEvent = withPromiseHandlers(
        (event: Event) => {
          expect(event.type).toBe('org.wt.persistence');
          expect(event.data?.content?.values).toBeTruthy();
          expect(event.data?.content?.error).toBeUndefined();
        },
        resolve,
        reject,
      );
    });
    agent.processMessage({ event: upsertObjectEvent, to: ['org.wt.persistence'], id: 'test' });
    return pr;
  });
  test('test find replacement object', async function () {
    const pr = new Promise((resolve, reject) => {
      agent.eventPublisher.publishEvent = withPromiseHandlers(
        (event: Event) => {
          expect(event.type).toBe('org.wt.persistence');
          expect(Events.valueNamed(event, 'result')[0].name).toBe('Replacement Object');
          expect(event.data?.content?.error).toBeUndefined();
        },
        resolve,
        reject,
      );
    });
    agent.processMessage({ event: findReplacementObjectEvent, to: ['org.wt.persistence'], id: 'test' });
    return pr;
  });
  test('test delete objects', async function () {
    const pr = new Promise((resolve, reject) => {
      agent.eventPublisher.publishEvent = withPromiseHandlers(
        (event: Event) => {
          expect(event.type).toBe('org.wt.persistence');
          expect(Events.valueNamed(event, 'result')).toBeTruthy();
          expect(event.data?.content?.error).toBeUndefined();
        },
        resolve,
        reject,
      );
    });
    agent.processMessage({ event: deleteObjectsEvent, to: ['org.wt.persistence'], id: 'test' });
    return pr;
  });
  test('test find objects (should have been deleted)', async function () {
    const pr = new Promise((resolve, reject) => {
      agent.eventPublisher.publishEvent = withPromiseHandlers(
        (event: Event) => {
          expect(event.type).toBe('org.wt.persistence');
          expect(Events.valueNamed(event, 'result')[0].length).toBe(0);
          expect(event.data?.content?.error).toBeUndefined();
        },
        resolve,
        reject,
      );
    });
    agent.processMessage({ event: findObjectsEvent, to: ['org.wt.persistence'], id: 'test' });
    return pr;
  });
  // cleanup in case of failure
  afterAll(async () => {
    await connMan.purgeAll();
    await connMan.disconnectAll();
  });
});

let connMan: AgentQueueConnectionManager;
let agent: Agent;

const testObject = {
  name: 'Object Test',
  id: 'object_test',
  testItems: [
    {
      name: 'test item',
    },
  ],
};

const replacementObject = {
  name: 'Replacement Object',
  id: 'replacement_test',
};

// create a base builder with the common parameters
const baseBldr = EventBuilder.create({ type: 'org.wt.tell', source: { id: 'SYSTEM', name: 'Workthreds Bot' } });

// fork the base builder and merge the tasks and data for the store object event
const storeObjectEvent = baseBldr
  .fork()
  .mergeTasks({ name: 'storeObject', op: Operations.PUT_OP, params: { type: 'ObjectModel', values: testObject } })
  .mergeData({ title: 'Store Object' })
  .build();

// this event is structured as a transaction as an examaple (even though there is only 1 task)
// notice the nested array structure in the task (an array is getting merged into the tasks array) which denotes a transaction
// the results will be structured in the same way (see the tests that use this event)
const findObjectEvent = baseBldr
  .fork()
  .mergeTasks([
    { name: 'findObject', op: Operations.GET_ONE_OP, params: { type: 'ObjectModel', matcher: { id: 'object_test' } } },
  ])
  .mergeData({ title: 'Find Object' })
  .build();

const updateObjectEvent = baseBldr
  .fork()
  .mergeTasks({
    name: 'updateObject',
    op: Operations.UPDATE_OP,
    params: {
      type: 'ObjectModel',
      matcher: { id: 'object_test' },
      values: { 'testItems.0.name': 'first testItem renamed' },
    },
  })
  .mergeData({ title: 'Update Object' })
  .build();

const upsertObjectEvent = baseBldr
  .fork()
  .mergeTasks({
    name: 'upsertObject',
    op: Operations.UPSERT_OP,
    params: {
      type: 'ObjectModel',
      matcher: { id: 'replacement_test' },
      values: replacementObject,
    },
  })
  .mergeData({ title: 'Upsert Object' })
  .build();

const findReplacementObjectEvent = baseBldr
  .fork()
  .mergeTasks({
    name: 'findReplacementObject',
    op: Operations.GET_ONE_OP,
    params: { type: 'ObjectModel', matcher: { id: 'replacement_test' } },
  })
  .mergeData({ title: 'Find Object' })
  .build();

// run deletes as a transaction, note: [][]
const deleteObjectsEvent = baseBldr
  .fork()
  .mergeTasks([
    {
      name: 'deleteObjects',
      op: Operations.DELETE_OP,
      params: { type: 'ObjectModel', matcher: { id: 'object_test' } },
    },
    {
      name: 'deleteObjects',
      op: Operations.DELETE_OP,
      params: { type: 'ObjectModel', matcher: { id: 'replacement_test' } },
    },
  ])
  .mergeData({ title: 'Delete Objects' })
  .build();

const findObjectsEvent = baseBldr
  .fork()
  .mergeTasks({
    name: 'findObjects',
    op: Operations.GET_OP,
    params: { type: 'ObjectModel', matcher: { id: { $in: ['object_test', 'replacement_test'] } } },
  })
  .mergeData({ title: 'Find Object' })
  .build();
