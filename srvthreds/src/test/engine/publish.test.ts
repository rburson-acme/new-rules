import { PatternModel, Logger, LoggerLevel } from '../../ts/thredlib/index.js';
import { events, EngineConnectionManager, withDispatcherPromise } from '../testUtils.js';

Logger.setLevel(LoggerLevel.INFO);

// Note: This demonstrates how the pattern can capture an outbound event ID in the onPublish handler
// and then use that ID in a subsequent filter to match the re: value of an inbound event.  i.e 'Wait for a response'

describe('publish', function () {
  beforeAll(async () => {
    connMan = await EngineConnectionManager.newEngineInstance(patternModels);
    await connMan.purgeAll();
  });
  /*
    This tests the use of the onPublish handler in the Publish model by capturing the outbound event ID in the pattern,
    and then using that ID in a subsequent filter condition to match the re: value of the inbound event.
  */
  test('match filter 0', function () {
    const pr = withDispatcherPromise(connMan.engine.dispatchers, async (message) => {
      expect(await await connMan.engine.numThreds).toBe(1);
      expect(message.event.data?.title).toBe('outbound.event0');
      expect(message.to).toContain('outbound.event0.recipient');
      outBoundEventId = message.event.id;
      thredId = message.event.thredId;
    });
    connMan.eventQ.queue(events.event0);
    return pr;
  });
  test('match filter 1', function () {
    const pr = withDispatcherPromise(connMan.engine.dispatchers, async (message) => {
      expect(await await connMan.engine.numThreds).toBe(1);
      expect(message.event.data?.title).toBe('outbound.event1');
      expect(message.to).toContain('outbound.event1.recipient');
    });
    connMan.eventQ.queue({ ...events.event1, thredId, re: outBoundEventId });
    return pr;
  });
  // cleanup in case of failure
  afterAll(async () => {
    await connMan.stopAllThreds();
    await connMan.purgeAll();
    await connMan.disconnectAll();
  });
});

let thredId: string | undefined;
let outBoundEventId: string | undefined;
let connMan: EngineConnectionManager;

const patternModels: PatternModel[] = [
  {
    name: 'Publish Test',
    instanceInterval: 0,
    maxInstances: 0,
    reactions: [
      {
        condition: {
          type: 'filter',
          xpr: "$event.type = 'inbound.event0'",
          transform: {
            eventDataTemplate: {
              title: 'outbound.event0',
            },
          },
          publish: {
            to: ['outbound.event0.recipient'],
            onPublish: {
              xpr: "$setLocal('outbound_event_id', $outboundEvent.id)",
            },
          },
        },
      },
      {
        condition: {
          type: 'filter',
          xpr: "($event.type = 'inbound.event1') and ($event.re = $local('outbound_event_id'))",
          transform: {
            eventDataTemplate: {
              title: 'outbound.event1',
            },
          },
          publish: {
            to: ['outbound.event1.recipient'],
          },
          transition: {
            name: '$noTransition',
          },
        },
      },
    ],
  },
];
