import {
  Logger,
  LoggerLevel,
  EventBuilder,
  systemEventTypes,
  PatternModel,
  Message,
  eventTypes,
  Events,
  SystemEvents,
} from '../../ts/thredlib/index.js';
import { Config as StaticAgentConfig } from '../../ts/agent/Config.js';
import {
  AgentConnectionManager,
  EngineConnectionManager,
  events,
  withDispatcherPromise,
  withPromiseHandlers,
} from '../testUtils.js';
import agentConfig from '../../ts/config/admin_agent.json';
import { Agent } from '../../ts/agent/Agent.js';
import AdminAgent from '../../ts/agent/admin/AdminAgent.js';
import { PersistenceFactory } from '../../ts/persistence/PersistenceFactory.js';
import sessionsModel from '../../ts/config/sessions/admin.session.json';
import resolverConfig from '../../ts/config/resolver_config.json';

StaticAgentConfig.agentConfig = agentConfig;
// set the agent implementation directly (vitest has a problem with dynamic imports)
StaticAgentConfig.agentConfig.agentImpl = AdminAgent;

Logger.setLevel(LoggerLevel.DEBUG);

describe('admin agent test', function () {
  beforeAll(async () => {
    engineConnMan = await EngineConnectionManager.newEngineInstance(patternModels);
    agentConnMan = await AgentConnectionManager.newAgentInstance(StaticAgentConfig.agentConfig, {
      sessionsModel,
      resolverConfig,
      runConfig: { patternModels },
    });
    await engineConnMan.purgeAll();
    await agentConnMan.purgeAll();
    agent = (agentConnMan.agent as any).handler as AdminAgent;
  });
  test('should start a new thred', function () {
    const pr = withDispatcherPromise(engineConnMan.engine.dispatchers, (message: Message) => {
      expect(engineConnMan.engine.numThreds).toBe(1);
      expect(message.event.data?.title).toBe('outbound.event0');
      expect(message.event.re).toBe('0');
      expect(message.to).toContain('outbound.event0.recipient');
      thredId = message.event.thredId;
    });
    engineConnMan.eventQ.queue(events.event0);
    return pr;
  });
  test('terminate Thred', async function () {
    const terminateThredEvent = getTerminateThredEvent(thredId as string);
    const pr = new Promise((resolve, reject) => {
      agent.dispatchMessage = withPromiseHandlers(
        (message: Message) => {
          expect(message.event.type).toBe('org.wt.admin');
          expect(message.event.re).toBe(terminateThredEvent.id);
          expect(Events.assertOneValue(message.event).status).toBe(systemEventTypes.successfulStatus);
          expect(Events.assertOneValue(message.event).op).toBe(systemEventTypes.operations.terminateThred);
        },
        resolve,
        reject,
      );
    });
    agent.processInboundEvent(terminateThredEvent);
    return pr;
  });
  test('thred should no longer be available', function () {
    const pr = withDispatcherPromise(engineConnMan.engine.dispatchers, (message: Message) => {
      const { event, to } = message;
      expect(engineConnMan.engine.numThreds).toBe(1);
      expect(to).toContain('test.dataset');
      expect(event.re).toBe(events.event1.id);
      expect(Events.getError(event)).toBeDefined();
    });
    engineConnMan.eventQ.queue({ ...events.event1, thredId });
    return pr;
  });
  afterAll(async () => {
    PersistenceFactory.getPersistence().removeDatabase();
    await agentConnMan.purgeAll();
    await agentConnMan.disconnectAll();
    await engineConnMan.purgeAll();
    await engineConnMan.disconnectAll();
  });
});

let agentConnMan: AgentConnectionManager;
let engineConnMan: EngineConnectionManager;
let agent: AdminAgent;
let thredId: string | undefined;

const getTerminateThredEvent = (thredId: string) => SystemEvents.getSystemTerminateThredEvent(thredId, { id: 'admin1', name: 'Admin User' });

const patternModels: PatternModel[] = [
  {
    name: 'System Test',
    instanceInterval: 0,
    maxInstances: 0,
    reactions: [
      {
        name: 'event0Reaction',
        condition: {
          type: 'filter',
          xpr: "$event.type = 'inbound.event0'",
          onTrue: { xpr: "$setLocal('event0', $event)" },
          transform: {
            meta: { reXpr: '$event.id' },
            eventDataTemplate: {
              title: 'outbound.event0',
            },
          },
          publish: {
            to: ['outbound.event0.recipient'],
          },
        },
      },
      {
        name: 'event1Reaction',
        condition: {
          type: 'filter',
          xpr: "$event.type = 'inbound.event1'",
          transform: {
            eventDataTemplate: {
              title: 'outbound.event1',
            },
          },
          publish: {
            to: ['outbound.event1.recipient'],
          },
        },
        expiry: {
          interval: 3000,
          transition: {
            name: 'event0Reaction',
            input: 'local',
            localName: 'event0',
          },
        },
      },
      {
        name: 'event2Reaction',
        condition: {
          type: 'filter',
          xpr: "$event.type = 'inbound.event2'",
          transform: {
            eventDataTemplate: {
              title: 'outbound.event2',
            },
          },
          publish: {
            to: ['outbound.event2.recipient'],
          },
        },
        expiry: {
          interval: 3000,
          transition: {
            name: 'event1Reaction',
            input: 'default',
          },
        },
      },
      {
        name: 'event3Reaction',
        condition: {
          type: 'filter',
          xpr: "$event.type = 'inbound.event3'",
          transform: {
            eventDataTemplate: {
              title: 'outbound.event3',
            },
          },
          transition: {
            name: 'event0Reaction',
            input: 'local',
            localName: 'event0',
          },
          publish: {
            to: ['outbound.event3.recipient'],
          },
        },
      },
    ],
  },
];
