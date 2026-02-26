import { Logger, LoggerLevel, Event, EventBuilder, Events } from '../../ts/thredlib/index.js';
import { AgentQueueConnectionManager, delay, withPromiseHandlers } from '../testUtils.js';
import { AgentService } from '../../ts/agent/AgentService.js';
import { AgentConfig } from '../../ts/config/AgentConfig.js';
import PatternAgent from '../../ts/agent/pattern/PatternAgent.js';
import { ConfigLoader } from '../../ts/config/ConfigLoader.js';

// set the agent implementation directly (vitest has a problem with dynamic imports)
const patternAgentConfigDef = await ConfigLoader.loadConfigFileFromPath('./src/test/config/pattern_agent.json');
(patternAgentConfigDef as any).agentImpl = PatternAgent;
const patternAgentConfig = new AgentConfig('pattern-agent1', patternAgentConfigDef);
    
Logger.setLevel(LoggerLevel.DEBUG);


describe('pattern agent test', function () {
  beforeAll(async () => {
    connMan = await AgentQueueConnectionManager.newAgentInstance(patternAgentConfig);
    await connMan.purgeAll();
    agent = connMan.agent;
  });

  test(
    'test generate pattern from prompt',
    async function () {
      const pr = new Promise((resolve, reject) => {
        agent.eventPublisher.publishEvent = withPromiseHandlers(
          async (event: Event) => {
            expect(event.type).toBe('org.wt.pattern');
            expect(event.data?.content?.values).toBeTruthy();
            expect(event.data?.content?.error).toBeUndefined();
            const result = Events.valueNamed(event, 'result');
            expect(result).toBeTruthy();
            expect(result.name).toBeTruthy();
            expect(Array.isArray(result.reactions)).toBe(true);
            expect(result.reactions.length).toBeGreaterThan(0);
            // The prompt requests a display-only UAV detection notification to Freddie (no response needed),
            // so at least one reaction must have advice with a text element (no eventType required)
            expect(reactionHasAdviceWithText(result.reactions)).toBe(true);
          },
          resolve,
          reject,
        );
      });
      agent.processMessage({ event: generatePatternEvent, to: ['org.wt.pattern'], id: 'message_id_0' });
      return pr;
    },
    60000,
  );

  // cleanup in case of failure
  afterAll(async () => {
    await delay(3000);
    await connMan.purgeAll();
    await connMan.disconnectAll();
  });
});

function reactionHasAdviceWithText(reactions: any[]): boolean {
  return reactions.some((r) => conditionHasAdviceWithText(r.condition));
}

function conditionHasAdviceWithText(condition: any): boolean {
  if (!condition) return false;
  const advice = condition.transform?.eventDataTemplate?.advice;
  if (advice?.template?.interactions?.some((i: any) => i.interaction?.content?.some((el: any) => el.text))) return true;
  return condition.operands?.some((op: any) => conditionHasAdviceWithText(op)) ?? false;
}

let connMan: AgentQueueConnectionManager;
let agent: AgentService;

const baseBldr = EventBuilder.create({ type: 'org.wt.tell', source: { id: 'SYSTEM', name: 'Workthreds Bot' } });

const generatePatternEvent = baseBldr
  .fork()
  .mergeData({
    title: 'Generate Pattern',
    content: {
      values: {
        prompt:
          'When a sensor detects a possible UAV, extract the sensor ID, confidence level, and location (latitude and longitude) from the detection event, then send a notification to Freddie with the title "UAV Detected" showing the detection location on a map along with the sensor ID, confidence level and ask the user if they would like to deploy the robot to investigate. If the user says yes, send an event to the robot to deploy to the detected location.  After deploying the robot send the robots location back to Freddie as an update and ask if they would like to see the robots video feed. If they say yes, send back the robots video feed',
      },
    },
  })
  .build();
