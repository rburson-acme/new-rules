import { PatternModel } from "../../ts/thredlib";

export const adminTestSource = { id: 'admin1', name: 'Admin User' };

export const adminTestPatternModels: PatternModel[] = [
  {
    meta: { active: true }, 
    name: 'System Test',
    id: 'systemTest',
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
          interval: 2000,
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
          interval: 2000,
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
