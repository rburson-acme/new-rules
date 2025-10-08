import { Logger, LoggerLevel, Event, EventBuilder, Events } from '../../ts/thredlib/index.js';
import { AgentQueueConnectionManager, withPromiseHandlers } from '../testUtils.js';
import agentConfig from '../config/robot_agent.json' with { type: 'json' };
import { AgentService } from '../../ts/agent/AgentService.js';
import { Operations } from '../../ts/thredlib/task/Operations.js';
import { AgentConfig } from '../../ts/config/AgentConfig.js';
import RobotAgent from '../../ts/agent/robot/RobotAgent.js';

// set the agent implementation directly (vitest has a problem with dynamic imports)
const robotAgentConfigDef = agentConfig;
(robotAgentConfigDef as any).agentImpl = RobotAgent;
const robotAgentConfig = new AgentConfig('robot-agent1', robotAgentConfigDef);

Logger.setLevel(LoggerLevel.DEBUG);

describe('robot agent test', function () {
  beforeAll(async () => {
    connMan = await AgentQueueConnectionManager.newAgentInstance(robotAgentConfig);
    await connMan.purgeAll();
    agent = connMan.agent;
  });
  test('test deploy robot', async function () {
    const eventId = deployEvent.id;
    const pr = new Promise((resolve, reject) => {
      agent.eventPublisher.publishEvent = withPromiseHandlers(
        (event: Event) => {
          expect(event.type).toBe('org.wt.robot');
          expect(event.data?.content?.values).toBeTruthy();
          expect(event.data?.content?.error).toBeUndefined();
          expect(event.re).toBe(eventId);
          // should return id as result if successful
          expect(Events.valueNamed(event, 'result')[0].robotId).toBe('robot_id_0');
        },
        resolve,
        reject,
      );
    });
    agent.processMessage({ event: deployEvent, to: ['org.wt.robot'], id: 'message_id_0' });
    return pr;
  });
  // cleanup in case of failure
  afterAll(async () => {
    await connMan.purgeAll();
    await connMan.disconnectAll();
  });
});

let connMan: AgentQueueConnectionManager;
let agent: AgentService;

// create a base builder with the common parameters
const baseBldr = EventBuilder.create({ type: 'org.wt.tell', source: { id: 'SYSTEM', name: 'Workthreds Bot' } });

// fork the base builder and merge the tasks and data for the store object event
const deployEvent = baseBldr
  .fork()
  .mergeTasks({
    name: 'deploy_robot',
    op: Operations.UPDATE_OP,
    params: {
      type: 'Param',
      matcher: {
        id: 'robot_id_0',
      },
      values: {
        routine: 'nav_path_1',
        location: {
          latitude: '30.094894',
          longitude: '-81.715309',
        },
      },
    },
  })
  .mergeData({ title: 'Deploy Robot' })
  .build();
