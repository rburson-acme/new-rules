import { PatternModel, Logger, LoggerLevel } from '../../ts/thredlib/index.js';
import { SessionAgent } from '../../ts/agent/session/SessionAgent.js';
import { SessionService } from '../../ts/agent/session/SessionService.js';
import { events, ServerConnectionManager, withDispatcherPromise } from '../testUtils.js';

import patternModel from '../../ts/config/patterns/simple_test.pattern.json' with { type: 'json' };
const patternModels: PatternModel[] = [patternModel as PatternModel];
import sessionsModel from '../../ts/config/sessions/simple_test_sessions_model.json';
import resolverConfig from '../../ts/config/simple_test_resolver_config.json';

Logger.setLevel(LoggerLevel.INFO);

describe('connMan.sessionServer test', function () {
  beforeAll(async () => {
    connMan = await ServerConnectionManager.newServerInstance(patternModels, sessionsModel, resolverConfig, {
      sessionsModel,
      resolverConfig,
    });
    await connMan.purgeAll();
    sessionAgent = (connMan.agent as any).handler as SessionAgent;
    sessionService = (sessionAgent as any).sessionService;
  });
  // match the first event and start the thred
  test('add 2 sessions and send an inception event', async function () {
    const pr = withDispatcherPromise(sessionAgent.dispatchers, (event, channelId) => {
      expect(event.data?.title).toBe('outbound.event0');
      expect(channelId).toBe('channel0');
      thredId = event.thredId;
    });
    sessionService.addSession({ id: 'session0', nodeId: 'session1' }, 'participant0', 'channel0');
    sessionService.addSession({ id: 'session1', nodeId: 'session1' }, 'participant1', 'channel1');
    connMan.agent.publishEvent(events.event0, 'participant1');
    return pr;
  });
  // progress thred to the next state
  test('send the next thred event', function () {
    const pr = withDispatcherPromise(sessionAgent.dispatchers, (event, channelId) => {
      expect(event.data?.title).toBe('outbound.event1');
      expect(channelId).toBe('channel1');
    });
    connMan.agent.publishEvent({ ...events.event1, thredId }, 'participant0');
    return pr;
  });
  // match the first event and start another thred
  test('add 2 more sessions and send an inception event', function () {
    const pr = withDispatcherPromise(sessionAgent.dispatchers, (event, channelId) => {
      expect(event.data?.title).toBe('outbound.event0');
      expect(channelId).toBe('channel0');
      thred2Id = event.thredId;
    });
    sessionService.addSession({ id: 'session2', nodeId: 'session1' }, 'participant2', 'channel2');
    sessionService.addSession({ id: 'session3', nodeId: 'session1' }, 'participant3', 'channel3');
    connMan.agent.publishEvent(events.event0, 'participant3');
    return pr;
  });
  // progress thred to the next state
  test('send the next thred event', function () {
    const pr = withDispatcherPromise(sessionAgent.dispatchers, (event, channelId) => {
      expect(event.data?.title).toBe('outbound.event1');
      expect(channelId).toBe('channel1');
    });
    connMan.agent.publishEvent({ ...events.event1, thredId: thred2Id }, 'participant2');
    return pr;
  });
  test('send the next thred event', function () {
    const pr = withDispatcherPromise(sessionAgent.dispatchers, (event, channelId) => {
      expect(event.data?.title).toBe('outbound.event2');
      expect(channelId).toBe('channel0');
    });
    connMan.agent.publishEvent({ ...events.event2, thredId: thred2Id }, 'participant2');
    return pr;
  });
  test('send the next thred event, and expect publish to group', function () {
    // expecting 2 callbacks for group
    const channels = new Set(['channel0', 'channel1']);
    const pr = withDispatcherPromise(sessionAgent.dispatchers, (event, channelId) => {
      expect(event.data?.title).toBe('outbound.event3');
      expect(channels).toContain(channelId);
      channels.delete(channelId);
    });
    connMan.agent.publishEvent({ ...events.event3, thredId: thred2Id }, 'participant2');
    return pr;
  });

  // cleanup in case of failure
  afterAll(async () => {
    await connMan.stopAllThreds('participant1');
    await connMan.purgeAll();
    await connMan.disconnectAll();
  });
});

let thredId: string | undefined;
let thred2Id: string | undefined;

let connMan: ServerConnectionManager;
let sessionAgent: SessionAgent;
let sessionService: SessionService;
