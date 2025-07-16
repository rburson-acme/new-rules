import {
  BuiltInEvents,
  EventBuilder,
  Events,
  eventTypes,
  Logger,
  LoggerLevel,
  PatternModel,
} from '../../ts/thredlib/index.js';

import { delay, EngineConnectionManager, events, withDispatcherPromise, withReject } from '../testUtils.js';

Logger.setLevel(LoggerLevel.DEBUG);

describe('effects tests', function () {
  beforeAll(async () => {
    connMan = await EngineConnectionManager.newEngineInstance(patternModels);
    await connMan.purgeAll();
  });
  test('start a thred that adds 2 participants', function () {
    const pr = withDispatcherPromise(connMan.engine.dispatchers, async (message) => {
      expect(await connMan.engine.numThreds).toBe(1);
      expect(message.event.data?.title).toBe('outbound.event0');
      expect(message.to).toContain('participant1');
      expect(message.to).toContain('participant2');
      thredId = message.event.thredId;
    });
    connMan.eventQ.queue({ ...events.event0, source: { id: 'participant0' } });
    return pr;
  });
  test('add 1 more participant', function () {
    const pr = withDispatcherPromise(connMan.engine.dispatchers, async (message) => {
      expect(message.event.data?.title).toBe('outbound.event1');
      expect(message.to).toContain('participant3');
      templateEventId = message.event.id;
    });
    connMan.eventQ.queue({ ...events.event1, thredId, source: { id: 'participant1' } });
    return pr;
  });
  test('send a client response that should also broadcast', function () {
    const pr = new Promise<void>((resolve, reject) => {
      let messagesReceived = 0;
      let broadcastResponseReceived = false;
      let responseReceivedReceived = false;
      const checkCompletion = () => broadcastResponseReceived && responseReceivedReceived && resolve();
      connMan.engine.dispatchers = [
        withReject(async (message) => {
          messagesReceived++;
          // Check for broadcast response message - effects should run and dispatch first
          if (
            message.event.source.id === eventTypes.system.source.id &&
            Events.valueNamed(message.event, 'messageSource')?.id === 'participant3'
          ) {
            expect(message.to).toContain('participant0');
            expect(message.to).toContain('participant1');
            expect(message.to).toContain('participant2');
            expect(message.to).not.toContain('participant3');
            broadcastResponseReceived = true;
            checkCompletion();
          }
          // Check for 'Response Received' message
          else if (message.event.data?.title === 'Response Received') {
            expect(message.to).toContain('participant0');
            expect(message.to).toContain('participant1');
            expect(message.to).toContain('participant2');
            expect(message.to).toContain('participant3');
            responseReceivedReceived = true;
            checkCompletion();
          }
          if (messagesReceived > 2) {
            reject(
              new Error(
                `Too many messages received without finding expected responses. Last message: ${JSON.stringify(message)}`,
              ),
            );
          }
        }, reject),
      ];
    });

    const interactionResponseEvent = EventBuilder.create({
      type: 'org.wt.client.tell',
      source: { id: 'participant3', name: 'Participant 3' },
      // re: is the id of the event that was sent to the client that contains the event data template
      re: templateEventId,
    })
      .mergeData({ title: 'Test Interaction Response' })
      .mergeValues({ test_response: true })
      .build();
    connMan.eventQ.queue({ ...interactionResponseEvent, thredId });
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
let templateEventId: string | undefined;

const patternModels: PatternModel[] = [
  {
    name: 'Effects Test',
    instanceInterval: 0,
    maxInstances: 0,
    broadcastAllowed: true,
    echoResponses: true,
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
            to: ['participant1', 'participant2'],
          },
        },
      },
      {
        name: 'event1reaction',
        condition: {
          type: 'filter',
          xpr: "$event.type = 'inbound.event1'",
          transform: {
            eventDataTemplate: {
              title: 'outbound.event1',
              advice: {
                title: 'Test interaction',
                eventType: 'org.wt.client.tell',
                template: {
                  name: 'test_interaction',
                  interactions: [
                    {
                      interaction: {
                        content: [
                          {
                            input: {
                              type: 'boolean',
                              name: 'test_response',
                              display: 'Would you like to send a response?',
                              set: [
                                {
                                  display: 'Yes',
                                  value: true,
                                },
                                {
                                  display: 'No',
                                  value: false,
                                },
                              ],
                            },
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            },
          },
          publish: {
            to: ['participant3'],
          },
        },
      },
      {
        condition: {
          type: 'filter',
          xpr: "$event.type = 'org.wt.client.tell'",
          transform: {
            eventDataTemplate: {
              title: 'Response Received',
            },
          },
          publish: {
            to: ['$thred'],
          },
          // don't terminate the thred because we need it to remain active in order to broadcast
          transition: {
            name: '$noTransition',
          },
        },
      },
    ],
  },
];

let connMan: EngineConnectionManager;
