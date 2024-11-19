import { Logger, LoggerLevel, Event, SMap, EventBuilder } from '../../ts/thredlib/index.js';
import { Config as StaticAgentConfig } from '../../ts/agent/Config.js';
import { AgentQueueConnectionManager, withPromiseHandlers } from '../testUtils.js';
import agentConfig from '../../ts/config/persistence_agent.json';
import { Agent } from '../../ts/agent/Agent.js';
import { PersistenceAgent } from '../../ts/agent/persistence/PersistenceAgent.js';
import { PersistenceFactory } from '../../ts/persistence/PersistenceFactory.js';

StaticAgentConfig.agentConfig = agentConfig;
// set the agent implementation directly (vitest has a problem with dynamic imports)
StaticAgentConfig.agentConfig.agentImpl = PersistenceAgent;

Logger.setLevel(LoggerLevel.INFO);

describe('persistence agent test', function () {
  beforeAll(async () => {
    connMan = await AgentQueueConnectionManager.newAgentInstance(StaticAgentConfig.agentConfig);
    await connMan.purgeAll();
    agent = connMan.agent;
  });
  test('test store pattern', async function () {
    const pr = new Promise((resolve, reject) => {
      agent.eventPublisher.publishEvent = withPromiseHandlers(
        (event: Event) => {
          expect(event.type).toBe('org.wt.persistence');
          expect(event.data?.content?.values).toBeTruthy();
          expect((event.data?.content?.values as SMap).error).toBeUndefined();
        },
        resolve,
        reject,
      );
    });
    agent.processMessage({ event: storePatternEvent, to: ['org.wt.persistence'], id: 'test' });
    return pr;
  });
  test('test find pattern', async function () {
    const pr = new Promise((resolve, reject) => {
      agent.eventPublisher.publishEvent = withPromiseHandlers(
        (event: Event) => {
          expect(event.type).toBe('org.wt.persistence');
          // this is an example of a task structured as a transaction - noticed the nested array result
          // see the event below for more details
          expect((event.data?.content?.values as SMap).result[0][0].name).toBe('Echo Test');
          expect((event.data?.content?.values as SMap).error).toBeUndefined();
        },
        resolve,
        reject,
      );
    });
    agent.processMessage({ event: findPatternEvent, to: ['org.wt.persistence'], id: 'test' });
    return pr;
  });
  test('test store pattern should fail w/ duplicate', async function () {
    const pr = new Promise((resolve, reject) => {
      agent.eventPublisher.publishEvent = withPromiseHandlers(
        (event: Event) => {
          expect(event.type).toBe('org.wt.persistence');
          expect(event.data?.content?.values).toBeFalsy();
          expect(event.data?.content?.error).toBeTruthy();
        },
        resolve,
        reject,
      );
    });
    agent.processMessage({ event: storePatternEvent, to: ['org.wt.persistence'], id: 'test' });
    return pr;
  });
  test('test update pattern', async function () {
    const pr = new Promise((resolve, reject) => {
      agent.eventPublisher.publishEvent = withPromiseHandlers(
        (event: Event) => {
          expect(event.type).toBe('org.wt.persistence');
          expect(event.data?.content?.values).toBeTruthy();
          expect((event.data?.content?.values as SMap).error).toBeUndefined();
        },
        resolve,
        reject,
      );
    });
    agent.processMessage({ event: updatePatternEvent, to: ['org.wt.persistence'], id: 'test' });
    return pr;
  });
  test('test find pattern', async function () {
    const pr = new Promise((resolve, reject) => {
      agent.eventPublisher.publishEvent = withPromiseHandlers(
        (event: Event) => {
          expect(event.type).toBe('org.wt.persistence');
          // this is an example of a task structured as a transaction - noticed the nested array result
          // see the event below for more details
          expect((event.data?.content?.values as SMap).result[0][0].reactions[0].name).toBe('first reaction renamed');
          expect((event.data?.content?.values as SMap).error).toBeUndefined();
        },
        resolve,
        reject,
      );
    });
    agent.processMessage({ event: findPatternEvent, to: ['org.wt.persistence'], id: 'test' });
    return pr;
  });
  test('test upsert pattern', async function () {
    const pr = new Promise((resolve, reject) => {
      agent.eventPublisher.publishEvent = withPromiseHandlers(
        (event: Event) => {
          expect(event.type).toBe('org.wt.persistence');
          expect(event.data?.content?.values).toBeTruthy();
          expect((event.data?.content?.values as SMap).error).toBeUndefined();
        },
        resolve,
        reject,
      );
    });
    agent.processMessage({ event: upsertPatternEvent, to: ['org.wt.persistence'], id: 'test' });
    return pr;
  });
  test('test find replacement pattern', async function () {
    const pr = new Promise((resolve, reject) => {
      agent.eventPublisher.publishEvent = withPromiseHandlers(
        (event: Event) => {
          expect(event.type).toBe('org.wt.persistence');
          // this is an example of a task structured as a transaction - noticed the nested array result
          // see the event below for more details
          expect((event.data?.content?.values as SMap).result[0].name).toBe('Replacement Pattern');
          expect((event.data?.content?.values as SMap).error).toBeUndefined();
        },
        resolve,
        reject,
      );
    });
    agent.processMessage({ event: findReplacementPatternEvent, to: ['org.wt.persistence'], id: 'test' });
    return pr;
  });
  test('test delete patterns', async function () {
    const pr = new Promise((resolve, reject) => {
      agent.eventPublisher.publishEvent = withPromiseHandlers(
        (event: Event) => {
          expect(event.type).toBe('org.wt.persistence');
          expect(event.data?.content?.values as SMap).toBeTruthy();
          expect((event.data?.content?.values as SMap).error).toBeUndefined();
        },
        resolve,
        reject,
      );
    });
    agent.processMessage({ event: deletePatternsEvent, to: ['org.wt.persistence'], id: 'test' });
    return pr;
  });
  test('test find patterns (should have been deleted)', async function () {
    const pr = new Promise((resolve, reject) => {
      agent.eventPublisher.publishEvent = withPromiseHandlers(
        (event: Event) => {
          expect(event.type).toBe('org.wt.persistence');
          expect((event.data?.content?.values as SMap).result[0].length).toBe(0);
          expect((event.data?.content?.values as SMap).error).toBeUndefined();
        },
        resolve,
        reject,
      );
    });
    agent.processMessage({ event: findPatternsEvent, to: ['org.wt.persistence'], id: 'test' });
    return pr;
  });
  // cleanup in case of failure
  afterAll(async () => {
    PersistenceFactory.getPersistence().removeDatabase();
    await connMan.purgeAll();
    await connMan.disconnectAll();
  });
});

let connMan: AgentQueueConnectionManager;
let agent: Agent;

const testPattern = {
  name: 'Echo Test',
  id: 'echo_test',
  instanceInterval: 0,
  maxInstances: 0,
  reactions: [
    {
      name: 'echo',
      condition: {
        type: 'filter',
        xpr: "$event.type = 'org.wt.echo'",
        onTrue: {
          xpr: "$setLocal('echoTimes', $local('echoTimes') ? $local('echoTimes') + 1 : 1)",
        },
        transform: {
          eventDataTemplate: {
            title: "$xpr( $valueNamed('echoTitle') & ' ' & $local('echoTimes') )",
            content: { values: { echoContent: "$xpr( $valueNamed('echoContent') )" } },
          },
        },
        publish: {
          to: "$xpr( $valueNamed('echoTo') )",
        },
        transition: {
          name: 'echo',
        },
      },
    },
  ],
};

const replacementPattern = {
  name: 'Replacement Pattern',
  id: 'replacement_test',
};

// create a base builder with the common parameters
const baseBldr = EventBuilder.create({ type: 'org.wt.tell', source: { id: 'SYSTEM', name: 'Workthreds Bot' } });

// fork the base builder and merge the tasks and data for the store pattern event
const storePatternEvent = baseBldr
  .fork()
  .mergeTasks({ name: 'storePattern', op: 'create', params: { type: 'PatternModel', values: testPattern } })
  .mergeData({ title: 'Store Pattern' })
  .build();

// this event is structured as a transaction as an examaple (even though there is only 1 task)
// notice the nested array structure which denotes a transaction
// the results will be structured in the same way (see the tests that use this event)
const findPatternEvent = baseBldr
  .fork()
  .mergeTasks([{ name: 'findPattern', op: 'findOne', params: { type: 'PatternModel', matcher: { id: 'echo_test' } } }])
  .mergeData({ title: 'Find Pattern' })
  .build();

const updatePatternEvent = baseBldr
  .fork()
  .mergeTasks({
    name: 'updatePattern',
    op: 'update',
    params: {
      type: 'PatternModel',
      matcher: { id: 'echo_test' },
      values: { 'reactions.0.name': 'first reaction renamed' },
    },
  })
  .mergeData({ title: 'Update Pattern' })
  .build();

const upsertPatternEvent = baseBldr
  .fork()
  .mergeTasks({
    name: 'upsertPattern',
    op: 'upsert',
    params: {
      type: 'PatternModel',
      matcher: { id: 'replacement_test' },
      values: replacementPattern,
    },
  })
  .mergeData({ title: 'Upsert Pattern' })
  .build();

const findReplacementPatternEvent = baseBldr
  .fork()
  .mergeTasks({
    name: 'findReplacementPattern',
    op: 'findOne',
    params: { type: 'PatternModel', matcher: { id: 'replacement_test' } },
  })
  .mergeData({ title: 'Find Pattern' })
  .build();

// run deletes as a transaction, note: [][]
const deletePatternsEvent = baseBldr
  .fork()
  .mergeTasks([
    { name: 'deletePatterns', op: 'delete', params: { type: 'PatternModel', matcher: { id: 'echo_test' } } },
    { name: 'deletePatterns', op: 'delete', params: { type: 'PatternModel', matcher: { id: 'replacement_test' } } },
  ])
  .mergeData({ title: 'Delete Patterns' })
  .build();

const findPatternsEvent = baseBldr
  .fork()
  .mergeTasks({
    name: 'findPatterns',
    op: 'find',
    params: { type: 'PatternModel', matcher: { id: { $in: ['echo_test', 'replacement_test'] } } },
  })
  .mergeData({ title: 'Find Pattern' })
  .build();
