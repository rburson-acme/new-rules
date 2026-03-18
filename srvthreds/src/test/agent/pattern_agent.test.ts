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

describe.skip('pattern agent test', function () {
  beforeAll(async () => {
    connMan = await AgentQueueConnectionManager.newAgentInstance(patternAgentConfig);
    await connMan.purgeAll();
    agent = connMan.agent;
  });

  test('test generate pattern from prompt', async function () {
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

          // --- Reaction: UAV sensor detection ---
          // Filters on sensor detection event, notifies Freddie with map + text + deploy input
          const sensorReaction = findReactionFilteringOn(result.reactions, 'org.wt.sensor.detectionEvent');
          expect(sensorReaction, 'sensor detection reaction exists').toBeTruthy();
          expect(
            conditionAdviceHasEventType(sensorReaction!.condition, 'org.wt.client.tell'),
            'sensor reaction collects deploy decision (advice.eventType = org.wt.client.tell)',
          ).toBe(true);
          expect(
            conditionAdviceHasElementType(sensorReaction!.condition, 'text'),
            'sensor reaction advice has text element (sensor ID + confidence)',
          ).toBe(true);
          expect(
            conditionAdviceHasElementType(sensorReaction!.condition, 'map'),
            'sensor reaction advice has map element (detection location)',
          ).toBe(true);
          expect(
            conditionAdviceHasElementType(sensorReaction!.condition, 'input'),
            'sensor reaction advice has input element (deploy decision)',
          ).toBe(true);
          expect(
            conditionPublishesTo(sensorReaction!.condition, 'participant0'),
            'sensor reaction publishes to participant0 (Freddie)',
          ).toBe(true);

          // --- Reaction: deploy robot ---
          // After Freddie says yes, a reaction sends a deployment task to the robot service
          expect(
            reactionPublishesTo(result.reactions, 'org.wt.robot'),
            'a reaction sends deployment task to robot service (org.wt.robot)',
          ).toBe(true);

          // --- Reaction: robot deployment response ---
          // Handles the robot response event, sends Freddie a location update + asks about video feed
          const robotResponseReaction = findReactionFilteringOn(result.reactions, 'org.wt.robot');
          expect(robotResponseReaction, 'robot response reaction exists').toBeTruthy();
          expect(
            conditionAdviceHasEventType(robotResponseReaction!.condition, 'org.wt.client.tell'),
            'robot response reaction collects video decision (advice.eventType = org.wt.client.tell)',
          ).toBe(true);
          expect(
            conditionAdviceHasElementType(robotResponseReaction!.condition, 'text'),
            'robot response reaction has text element (robot location update)',
          ).toBe(true);
          expect(
            conditionAdviceHasElementType(robotResponseReaction!.condition, 'input'),
            'robot response reaction has input element (video feed decision)',
          ).toBe(true);
          expect(
            conditionPublishesTo(robotResponseReaction!.condition, 'participant0'),
            'robot response reaction publishes to participant0 (Freddie)',
          ).toBe(true);

          // --- Reaction: send video feed ---
          // After Freddie says yes to video, a reaction sends the video feed
          expect(adviceHasElementType(result.reactions, 'video'), 'a reaction sends video feed to Freddie').toBe(true);
        },
        resolve,
        reject,
      );
    });
    agent.processMessage({ event: generatePatternEvent, to: ['org.wt.pattern'], id: 'message_id_0' });
    return pr;
  }, 60000);

  // cleanup in case of failure
  afterAll(async () => {
    await delay(3000);
    await connMan.purgeAll();
    await connMan.disconnectAll();
  });
});

// --- Test helpers ---

/** Find the first reaction whose condition (or any nested operand) filters on the given event type */
function findReactionFilteringOn(reactions: any[], eventType: string): any {
  return reactions.find((r) => conditionFiltersOnEventType(r.condition, eventType));
}

function conditionFiltersOnEventType(condition: any, eventType: string): boolean {
  if (!condition) return false;
  if (condition.xpr?.includes(eventType)) return true;
  return condition.operands?.some((op: any) => conditionFiltersOnEventType(op, eventType)) ?? false;
}

/** Check if any reaction (or any nested operand condition) publishes to the given target */
function reactionPublishesTo(reactions: any[], target: string): boolean {
  return reactions.some((r) => conditionPublishesTo(r.condition, target));
}

function conditionPublishesTo(condition: any, target: string): boolean {
  if (!condition) return false;
  const to = condition.publish?.to;
  if (to === target || (Array.isArray(to) && to.includes(target))) return true;
  return condition.operands?.some((op: any) => conditionPublishesTo(op, target)) ?? false;
}

/** Check if any reaction has advice containing the given element type (text, map, input, video, image, group) */
function adviceHasElementType(reactions: any[], elementType: string): boolean {
  return reactions.some((r) => conditionAdviceHasElementType(r.condition, elementType));
}

function conditionAdviceHasElementType(condition: any, elementType: string): boolean {
  if (!condition) return false;
  const advice = condition.transform?.eventDataTemplate?.advice;
  if (advice?.template?.interactions?.some((i: any) => i.interaction?.content?.some((el: any) => el[elementType])))
    return true;
  return condition.operands?.some((op: any) => conditionAdviceHasElementType(op, elementType)) ?? false;
}

/** Check if advice on a condition has a specific eventType */
function conditionAdviceHasEventType(condition: any, eventType: string): boolean {
  if (!condition) return false;
  if (condition.transform?.eventDataTemplate?.advice?.eventType === eventType) return true;
  return condition.operands?.some((op: any) => conditionAdviceHasEventType(op, eventType)) ?? false;
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
