import { Logger, LoggerLevel, Event, EventBuilder } from '../../ts/thredlib/index.js';
import { AgentConnectionManager, createUserDbFixtures, withPromiseHandlers } from '../testUtils.js';
import { AgentService } from '../../ts/agent/AgentService.js';
import { AgentConfig } from '../../ts/config/AgentConfig.js';
import SessionAgent from '../../ts/agent/session/SessionAgent.js';

const SESSION_AGENT_PORT = 3001;

// set the agent implementation directly (vitest has a problem with dynamic imports)
const sessionAgentConfigDef = {
  name: 'Session Agent',
  nodeType: 'org.wt.session',
  nodeId: 'org.wt.session1',
  subscriptionNames: ['sub_session1_message'],
  agentImpl: SessionAgent,
  customConfig: {
    port: SESSION_AGENT_PORT,
    sessionsModelPath: 'src/test/config/sessions/simple_test_sessions_model.json',
    resolverConfigPath: 'src/test/config/simple_test_resolver_config.json',
  },
} as AgentConfig;
const sessionAgentConfig = new AgentConfig('session-agent1', sessionAgentConfigDef);

Logger.setLevel(LoggerLevel.DEBUG);

describe('session agent http test', function () {
  beforeAll(async () => {
    connMan = await AgentConnectionManager.newAgentInstance(sessionAgentConfig);
    await connMan.purgeAll();
    agent = connMan.agent;
    await createUserDbFixtures();
    // login to get an access token
    const loginResponse = await fetch(`http://localhost:${SESSION_AGENT_PORT}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participantId: 'participant0', password: 'password0' }),
    });
    expect(loginResponse.status).toBe(200);
    const authResult = (await loginResponse.json()) as any;
    accessToken = authResult.accessResult.accessToken;
  });

  test('test post event to /event endpoint', async function () {
    const pr = new Promise((resolve, reject) => {
      agent.eventPublisher.publishEvent = withPromiseHandlers(
        (event: Event) => {
          // the event handler forces source.id to the authenticated participantId
          expect(event.source?.id).toBe('participant0');
          expect(event.type).toBe('test.event');
          expect(event.data?.title).toBe('Test Event');
        },
        resolve,
        reject,
      );
    });
    const response = await fetch(`http://localhost:${SESSION_AGENT_PORT}/event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(testEvent),
    });
    expect(response.status).toBe(200);
    return pr;
  });

  // cleanup
  afterAll(async () => {
    await connMan.purgeAll();
    await connMan.disconnectAll();
  });
});

let connMan: AgentConnectionManager;
let agent: AgentService;
let accessToken: string;

const testEvent = EventBuilder.create({
  type: 'test.event',
  source: { id: 'participant0' },
})
  .mergeData({ title: 'Test Event' })
  .build();
