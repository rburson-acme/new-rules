import {
  PatternModel,
  Logger,
  LoggerLevel,
  SystemEvents,
  systemEventTypes,
  eventTypes,
} from '../../ts/thredlib/index.js';
import { events as testEvents, EngineConnectionManager, withDispatcherPromise, withReject } from '../testUtils.js';
import { Id } from '../../ts/thredlib/core/Id.js';

Logger.setLevel(LoggerLevel.INFO);

// @TODO change all these to use the thredlib utilities

describe('system', function () {
  beforeAll(async () => {
    connMan = await EngineConnectionManager.newEngineInstance(patternModels);
    await connMan.purgeAll();
  });
  // match the first event and start the thred
  test('should start a new thred', function () {
    const pr = withDispatcherPromise(connMan.engine.dispatchers, (message) => {
      expect(connMan.engine.numThreds).toBe(1);
      expect(message.event.data?.title).toBe('outbound.event0');
      expect(message.to).toContain('outbound.event0.recipient');
      thredId = message.event.thredId;
    });
    connMan.eventQ.queue(testEvents.event0);
    return pr;
  });
  // should move to the next reaction when no transition name is specified
  // should expire and move back to event0Reaction and 'replay' input
  // the admin operation should also get a successful response
  test('expire event1Reaction and replay event0Reaction', function () {
    const currentReactionName = (connMan.engine.thredsStore as any).thredStores[thredId as string].currentReaction.name;
    expect(currentReactionName).toBe('event1Reaction');
    const pr = new Promise<void>((resolve, reject) => {
      // note can't really guarantee the order of the messages here - should really be more complicated OR
      connMan.engine.dispatchers = [
        withReject((message) => {
          expect(connMan.engine.numThreds).toBe(1);
          expect(message.event.data?.title).toBe('outbound.event0');
          expect(message.to).toContain('outbound.event0.recipient');
          connMan.engine.dispatchers = [
            withReject((message) => {
              expect(message.to).toContain('testUser');
              expect(message.event?.type).toBe(eventTypes.control.sysControl.type);
              expect(message.event.data?.content.values.operation).toBe(systemEventTypes.operations.expireReaction);
              expect(message.event.data?.content.values.status).toBe(systemEventTypes.successfulStatus);
              resolve();
            }, reject),
          ];
        }, reject),
      ];
    });
    connMan.eventQ.queue(
      SystemEvents.getSystemExpireThredEvent(Id.nextEventId, thredId as string, 'event1Reaction', { id: 'testUser'}),
    );
    return pr;
  });
  test('move to event2Reaction', function () {
    const currentReactionName = (connMan.engine.thredsStore as any).thredStores[thredId as string].currentReaction.name;
    expect(currentReactionName).toBe('event1Reaction');
    const pr = withDispatcherPromise(connMan.engine.dispatchers, (message) => {
      expect(connMan.engine.numThreds).toBe(1);
      expect(message.event.data?.title).toBe('outbound.event1');
      expect(message.to).toContain('outbound.event1.recipient');
    });
    connMan.eventQ.queue({ ...testEvents.event1, thredId });
    return pr;
  });
  test('expire event2Reaction and move to event1Reaction (no event replay)', async function () {
    const currentReactionName = (connMan.engine.thredsStore as any).thredStores[thredId as string].currentReaction.name;
    expect(currentReactionName).toBe('event2Reaction');
    // the admin operation should also get a successful response
    const pr = withDispatcherPromise(connMan.engine.dispatchers, (message) => {
      expect(message.to).toContain('testUser');
      expect(message.event?.type).toBe(eventTypes.control.sysControl.type);
      expect(message.event.data?.content.values.operation).toBe(systemEventTypes.operations.expireReaction);
      expect(message.event.data?.content.values.status).toBe(systemEventTypes.successfulStatus);
    });
    await connMan.engine
      .consider(
        SystemEvents.getSystemExpireThredEvent(Id.nextEventId, thredId as string, 'event2Reaction', { id: 'testUser'}),
      )
      .then(() => {
        const currentReactionName = (connMan.engine.thredsStore as any).thredStores[thredId as string].currentReaction
          .name;
        expect(currentReactionName).toBe('event1Reaction');
      });
    return pr;
  });
  test('move to event3Reaction', async function () {
    const currentReactionName = (connMan.engine.thredsStore as any).thredStores[thredId as string].currentReaction.name;
    expect(currentReactionName).toBe('event1Reaction');
    // the admin operation should also get a successful response
    const pr = withDispatcherPromise(connMan.engine.dispatchers, (message) => {
      expect(message.to).toContain('testUser');
      expect(message.event?.type).toBe(eventTypes.control.sysControl.type);
      expect(message.event.data?.content.values.operation).toBe(systemEventTypes.operations.transitionThred);
      expect(message.event.data?.content.values.status).toBe(systemEventTypes.successfulStatus);
    });
    await connMan.engine
      .consider(
        SystemEvents.getSystemTransitionThredEvent(
          Id.nextEventId,
          thredId as string,
          { name: 'event3Reaction', input: 'default' },
          { id: 'testUser'},
        ),
      )
      .then(() => {
        const currentReactionName = (connMan.engine.thredsStore as any).thredStores[thredId as string].currentReaction
          .name;
        expect(currentReactionName).toBe('event3Reaction');
      });
    return pr;
  });
  test('event3Reaction (transitions back to event0Reaction and replay input)', function () {
    const pr = new Promise<void>((resolve, reject) => {
      connMan.engine.dispatchers = [
        withReject((message) => {
          expect(connMan.engine.numThreds).toBe(1);
          expect(message.event.data?.title).toBe('outbound.event3');
          expect(message.to).toContain('outbound.event3.recipient');
          connMan.engine.dispatchers = [
            withReject((message) => {
              expect(connMan.engine.numThreds).toBe(1);
              expect(message.event.data?.title).toBe('outbound.event0');
              expect(message.to).toContain('outbound.event0.recipient');
              resolve();
            }, reject),
          ];
        }, reject),
      ];
    });
    connMan.eventQ.queue({ ...testEvents.event3, thredId });
    return pr;
  });
  test('terminate the thred', async function () {
    const currentReactionName = (connMan.engine.thredsStore as any).thredStores[thredId as string].currentReaction.name;
    expect(currentReactionName).toBe('event1Reaction');
    // the admin operation should also get a successful response
    const pr = withDispatcherPromise(connMan.engine.dispatchers, (message) => {
      expect(message.to).toContain('testUser');
      expect(message.event?.type).toBe(eventTypes.control.sysControl.type);
      expect(message.event.data?.content.values.operation).toBe(systemEventTypes.operations.terminateThred);
      expect(message.event.data?.content.values.status).toBe(systemEventTypes.successfulStatus);
    });
    await connMan.engine
      .consider(SystemEvents.getSystemTerminateThredEvent(Id.nextEventId, thredId as string, { id: 'testUser'}))
      .then(() => {
        expect(connMan.engine.numThreds).toBe(0);
      });
    return pr;
  });
  test('should start a new thred', function () {
    const pr = withDispatcherPromise(connMan.engine.dispatchers, (message) => {
      expect(connMan.engine.numThreds).toBe(1);
      expect(message.event.data?.title).toBe('outbound.event0');
      expect(message.to).toContain('outbound.event0.recipient');
      thredId = message.event.thredId;
    });
    connMan.eventQ.queue(testEvents.event0);
    return pr;
  });
  test('move to event2Reaction', function () {
    const currentReactionName = (connMan.engine.thredsStore as any).thredStores[thredId as string].currentReaction.name;
    expect(currentReactionName).toBe('event1Reaction');
    const pr = withDispatcherPromise(connMan.engine.dispatchers, (message) => {
      expect(connMan.engine.numThreds).toBe(1);
      expect(message.event.data?.title).toBe('outbound.event1');
      expect(message.to).toContain('outbound.event1.recipient');
    });
    connMan.eventQ.queue({ ...testEvents.event1, thredId });
    return pr;
  });
  test('should start a new thred', function () {
    const pr = withDispatcherPromise(connMan.engine.dispatchers, (message) => {
      expect(connMan.engine.numThreds).toBe(2);
      expect(message.event.data?.title).toBe('outbound.event0');
      expect(message.to).toContain('outbound.event0.recipient');
      thredId = message.event.thredId;
    });
    connMan.eventQ.queue(testEvents.event0);
    return pr;
  });
  test('terminate all threds', async function () {
    // the admin operation should also get a successful response
    const pr = withDispatcherPromise(connMan.engine.dispatchers, (message) => {
      expect(message.to).toContain('testUser');
      expect(message.event?.type).toBe(eventTypes.control.sysControl.type);
      expect(message.event.data?.content.values.operation).toBe(systemEventTypes.operations.terminateAllThreds);
      expect(message.event.data?.content.values.status).toBe(systemEventTypes.successfulStatus);
    });
    await connMan.engine.consider(SystemEvents.getTerminateAllThredsEvent(Id.nextEventId, { id: 'testUser'})).then(() => {
      expect(connMan.engine.numThreds).toBe(0);
    });
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

let connMan: EngineConnectionManager;
