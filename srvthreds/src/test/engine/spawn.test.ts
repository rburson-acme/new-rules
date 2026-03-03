import { PatternModel, Logger, LoggerLevel } from '../../ts/thredlib/index.js';
import { events, EngineConnectionManager, withDispatcherPromise, withReject } from '../testUtils.js';

Logger.setLevel(LoggerLevel.INFO);

// =============================================================================
// Child spawn with forward input
// =============================================================================
describe('spawn - child with forward input', () => {
  let connMan: EngineConnectionManager;
  let parentThredId: string;
  let childThredId: string;

  beforeAll(async () => {
    connMan = await EngineConnectionManager.newEngineInstance(childForwardPatterns);
    await connMan.purgeAll();
  });

  test('event0 creates parent thred', () => {
    const pr = withDispatcherPromise(connMan.engine.dispatchers, async (message) => {
      expect(message.event.data?.title).toBe('parent_started');
      parentThredId = message.event.thredId;
      expect(await connMan.engine.numThreds).toBe(1);
    });
    connMan.eventQ.queue(events.event0);
    return pr;
  });

  test('event1 triggers spawn, child processes forwarded event', async () => {
    const pr = new Promise<void>((resolve, reject) => {
      connMan.engine.dispatchers = [
        withReject(async (message) => {
          // parent dispatches first
          expect(message.event.data?.title).toBe('parent_spawning');
          expect(message.event.thredId).toBe(parentThredId);
          connMan.engine.dispatchers = [
            withReject(async (message) => {
              // child dispatches second (forwarded event matched child's first reaction)
              expect(message.event.data?.title).toBe('child_started');
              childThredId = message.event.thredId;
              expect(childThredId).not.toBe(parentThredId);
              resolve();
            }, reject),
          ];
        }, reject),
      ];
    });
    await connMan.engine.consider({ ...events.event1, thredId: parentThredId });
    return pr;
  });

  test('parent-child relationship is tracked', async () => {
    expect(await connMan.engine.numThreds).toBe(2);
    const parentStore = await connMan.engine.thredsStore.getThredStoreReadOnly(parentThredId);
    expect(parentStore.childThredIds).toContain(childThredId);
    const childStore = await connMan.engine.thredsStore.getThredStoreReadOnly(childThredId);
    expect(childStore.parentThredId).toBe(parentThredId);
    expect(childStore.spawnType).toBe('child');
    expect(childStore.isChild).toBe(true);
  });

  test('parent termination cascade terminates child', async () => {
    const pr = withDispatcherPromise(connMan.engine.dispatchers, (message) => {
      expect(message.event.data?.title).toBe('parent_terminating');
    });
    await connMan.engine.consider({ ...events.event2, thredId: parentThredId });
    await pr;
    expect(await connMan.engine.numThreds).toBe(0);
  });

  afterAll(async () => {
    await connMan.stopAllThreds();
    await connMan.purgeAll();
    await connMan.disconnectAll();
  });
});

// =============================================================================
// Sibling spawn with forward input
// =============================================================================
describe('spawn - sibling with forward input', () => {
  let connMan: EngineConnectionManager;
  let parentThredId: string;
  let siblingThredId: string;

  beforeAll(async () => {
    connMan = await EngineConnectionManager.newEngineInstance(siblingForwardPatterns);
    await connMan.purgeAll();
  });

  test('event0 creates parent thred', () => {
    const pr = withDispatcherPromise(connMan.engine.dispatchers, async (message) => {
      expect(message.event.data?.title).toBe('sib_parent_started');
      parentThredId = message.event.thredId;
    });
    connMan.eventQ.queue(events.event0);
    return pr;
  });

  test('event1 triggers sibling spawn', async () => {
    const pr = new Promise<void>((resolve, reject) => {
      connMan.engine.dispatchers = [
        withReject(async (message) => {
          expect(message.event.data?.title).toBe('sib_parent_spawning');
          connMan.engine.dispatchers = [
            withReject(async (message) => {
              expect(message.event.data?.title).toBe('sibling_started');
              siblingThredId = message.event.thredId;
              resolve();
            }, reject),
          ];
        }, reject),
      ];
    });
    await connMan.engine.consider({ ...events.event1, thredId: parentThredId });
    return pr;
  });

  test('sibling has correct spawn type', async () => {
    const siblingStore = await connMan.engine.thredsStore.getThredStoreReadOnly(siblingThredId);
    expect(siblingStore.parentThredId).toBe(parentThredId);
    expect(siblingStore.spawnType).toBe('sibling');
    expect(siblingStore.isChild).toBe(false);
  });

  test('parent termination does NOT cascade terminate sibling', async () => {
    const pr = withDispatcherPromise(connMan.engine.dispatchers, (message) => {
      expect(message.event.data?.title).toBe('sib_parent_terminating');
    });
    await connMan.engine.consider({ ...events.event2, thredId: parentThredId });
    await pr;
    // sibling should survive
    expect(await connMan.engine.numThreds).toBe(1);
    const allThredIds = await connMan.engine.thredsStore.getAllThredIds();
    expect(allThredIds).toContain(siblingThredId);
  });

  afterAll(async () => {
    await connMan.stopAllThreds();
    await connMan.purgeAll();
    await connMan.disconnectAll();
  });
});

// =============================================================================
// Child spawn with default input (child waits for its own event)
// =============================================================================
describe('spawn - child with default input', () => {
  let connMan: EngineConnectionManager;
  let parentThredId: string;
  let childThredId: string;

  beforeAll(async () => {
    connMan = await EngineConnectionManager.newEngineInstance(childDefaultPatterns);
    await connMan.purgeAll();
  });

  test('event0 spawns child with no initial input', async () => {
    // only parent dispatches — child has no input event so it sits idle
    const pr = withDispatcherPromise(connMan.engine.dispatchers, async (message) => {
      expect(message.event.data?.title).toBe('default_parent_started');
      parentThredId = message.event.thredId;
    });
    await connMan.engine.consider(events.event0);
    await pr;

    expect(await connMan.engine.numThreds).toBe(2);
    const parentStore = await connMan.engine.thredsStore.getThredStoreReadOnly(parentThredId);
    childThredId = parentStore.childThredIds[0];
    expect(childThredId).toBeDefined();
  });

  test('child processes its own bound event', async () => {
    const pr = withDispatcherPromise(connMan.engine.dispatchers, (message) => {
      expect(message.event.data?.title).toBe('default_child_started');
      expect(message.event.thredId).toBe(childThredId);
    });
    await connMan.engine.consider({ ...events.event1, thredId: childThredId });
    return pr;
  });

  afterAll(async () => {
    await connMan.stopAllThreds();
    await connMan.purgeAll();
    await connMan.disconnectAll();
  });
});

// =============================================================================
// Child spawn with local input (child receives stored event)
// =============================================================================
describe('spawn - child with local input', () => {
  let connMan: EngineConnectionManager;
  let parentThredId: string;
  let childThredId: string;

  beforeAll(async () => {
    connMan = await EngineConnectionManager.newEngineInstance(childLocalPatterns);
    await connMan.purgeAll();
  });

  test('event0 creates parent thred', () => {
    const pr = withDispatcherPromise(connMan.engine.dispatchers, async (message) => {
      expect(message.event.data?.title).toBe('local_parent_started');
      parentThredId = message.event.thredId;
    });
    connMan.eventQ.queue(events.event0);
    return pr;
  });

  test('event1 triggers spawn with local input from stored event', async () => {
    const pr = new Promise<void>((resolve, reject) => {
      connMan.engine.dispatchers = [
        withReject(async (message) => {
          expect(message.event.data?.title).toBe('local_parent_spawning');
          connMan.engine.dispatchers = [
            withReject(async (message) => {
              // child receives the stored event (event1) via local input
              expect(message.event.data?.title).toBe('local_child_started');
              childThredId = message.event.thredId;
              expect(childThredId).not.toBe(parentThredId);
              resolve();
            }, reject),
          ];
        }, reject),
      ];
    });
    await connMan.engine.consider({ ...events.event1, thredId: parentThredId });
    return pr;
  });

  afterAll(async () => {
    await connMan.stopAllThreds();
    await connMan.purgeAll();
    await connMan.disconnectAll();
  });
});

// =============================================================================
// Spawn with context copying
// =============================================================================
describe('spawn - context copying', () => {
  let connMan: EngineConnectionManager;
  let parentThredId: string;
  let childThredId: string;

  beforeAll(async () => {
    connMan = await EngineConnectionManager.newEngineInstance(contextCopyPatterns);
    await connMan.purgeAll();
  });

  test('event0 creates parent and sets locals', () => {
    const pr = withDispatcherPromise(connMan.engine.dispatchers, async (message) => {
      expect(message.event.data?.title).toBe('ctx_parent_started');
      parentThredId = message.event.thredId;
    });
    connMan.eventQ.queue(events.event0);
    return pr;
  });

  test('event1 triggers spawn with context: true, child inherits scope and participants', async () => {
    const pr = new Promise<void>((resolve, reject) => {
      connMan.engine.dispatchers = [
        withReject(async (message) => {
          expect(message.event.data?.title).toBe('ctx_parent_spawning');
          connMan.engine.dispatchers = [
            withReject(async (message) => {
              expect(message.event.data?.title).toBe('ctx_child_started');
              childThredId = message.event.thredId;
              resolve();
            }, reject),
          ];
        }, reject),
      ];
    });
    await connMan.engine.consider({ ...events.event1, thredId: parentThredId });
    await pr;

    // verify child inherited parent's scope
    const childStore = await connMan.engine.thredsStore.getThredStoreReadOnly(childThredId);
    expect(childStore.thredContext.getLocal('parent_data')).toEqual({ key: 'value' });
    expect(childStore.thredContext.getLocal('parent_counter')).toBe(42);

    // verify child inherited parent's participants
    const childParticipants = childStore.thredContext.getParticipantAddresses();
    expect(childParticipants).toContain('parent_recipient');
    expect(childParticipants).toContain('test.dataset');
  });

  test('parent scope is not affected by child (deep copy)', async () => {
    const parentStore = await connMan.engine.thredsStore.getThredStoreReadOnly(parentThredId);
    // parent still has its original values
    expect(parentStore.thredContext.getLocal('parent_data')).toEqual({ key: 'value' });
    expect(parentStore.thredContext.getLocal('parent_counter')).toBe(42);
  });

  afterAll(async () => {
    await connMan.stopAllThreds();
    await connMan.purgeAll();
    await connMan.disconnectAll();
  });
});

// =============================================================================
// Spawn with missing pattern (graceful handling)
// =============================================================================
describe('spawn - missing pattern', () => {
  let connMan: EngineConnectionManager;

  beforeAll(async () => {
    connMan = await EngineConnectionManager.newEngineInstance(missingPatternPatterns);
    await connMan.purgeAll();
  });

  test('spawn referencing non-existent pattern does not crash', async () => {
    const pr = withDispatcherPromise(connMan.engine.dispatchers, async (message) => {
      expect(message.event.data?.title).toBe('missing_parent_started');
    });
    await connMan.engine.consider(events.event0);
    await pr;
    // parent thred exists; spawn silently failed
    expect(await connMan.engine.numThreds).toBe(1);
  });

  afterAll(async () => {
    await connMan.stopAllThreds();
    await connMan.purgeAll();
    await connMan.disconnectAll();
  });
});

// =============================================================================
// Pattern definitions
// =============================================================================

const childForwardPatterns: PatternModel[] = [
  {
    name: 'Child Forward Parent',
    id: 'child_forward_parent',
    instanceInterval: 0,
    maxInstances: 0,
    reactions: [
      {
        name: 'start',
        condition: {
          type: 'filter',
          xpr: "$event.type = 'inbound.event0'",
          transform: { eventDataTemplate: { title: 'parent_started' } },
          publish: { to: ['parent_recipient'] },
        },
      },
      {
        name: 'spawn_trigger',
        condition: {
          type: 'filter',
          xpr: "$event.type = 'inbound.event1'",
          transform: { eventDataTemplate: { title: 'parent_spawning' } },
          publish: { to: ['parent_recipient'] },
          spawn: {
            names: ['child_forward_target'],
            input: 'forward',
            type: 'child',
          },
        },
      },
      {
        name: 'parent_final',
        condition: {
          type: 'filter',
          xpr: "$event.type = 'inbound.event2'",
          transform: { eventDataTemplate: { title: 'parent_terminating' } },
          publish: { to: ['parent_recipient'] },
          transition: { name: '$terminate' },
        },
      },
    ],
  },
  {
    name: 'Child Forward Target',
    id: 'child_forward_target',
    instanceInterval: 0,
    maxInstances: 0,
    reactions: [
      {
        name: 'child_start',
        condition: {
          type: 'filter',
          xpr: "$event.type = 'inbound.event1'",
          transform: { eventDataTemplate: { title: 'child_started' } },
          publish: { to: ['child_recipient'] },
        },
      },
      {
        name: 'child_next',
        condition: {
          type: 'filter',
          xpr: "$event.type = 'inbound.event3'",
          transform: { eventDataTemplate: { title: 'child_continued' } },
          publish: { to: ['child_recipient'] },
          transition: { name: '$terminate' },
        },
      },
    ],
  },
];

const siblingForwardPatterns: PatternModel[] = [
  {
    name: 'Sibling Forward Parent',
    id: 'sibling_forward_parent',
    instanceInterval: 0,
    maxInstances: 0,
    reactions: [
      {
        name: 'start',
        condition: {
          type: 'filter',
          xpr: "$event.type = 'inbound.event0'",
          transform: { eventDataTemplate: { title: 'sib_parent_started' } },
          publish: { to: ['parent_recipient'] },
        },
      },
      {
        name: 'spawn_trigger',
        condition: {
          type: 'filter',
          xpr: "$event.type = 'inbound.event1'",
          transform: { eventDataTemplate: { title: 'sib_parent_spawning' } },
          publish: { to: ['parent_recipient'] },
          spawn: {
            names: ['sibling_forward_target'],
            input: 'forward',
            type: 'sibling',
          },
        },
      },
      {
        name: 'parent_final',
        condition: {
          type: 'filter',
          xpr: "$event.type = 'inbound.event2'",
          transform: { eventDataTemplate: { title: 'sib_parent_terminating' } },
          publish: { to: ['parent_recipient'] },
          transition: { name: '$terminate' },
        },
      },
    ],
  },
  {
    name: 'Sibling Forward Target',
    id: 'sibling_forward_target',
    instanceInterval: 0,
    maxInstances: 0,
    reactions: [
      {
        name: 'sibling_start',
        condition: {
          type: 'filter',
          xpr: "$event.type = 'inbound.event1'",
          transform: { eventDataTemplate: { title: 'sibling_started' } },
          publish: { to: ['sibling_recipient'] },
        },
      },
      {
        name: 'sibling_next',
        condition: {
          type: 'filter',
          xpr: "$event.type = 'inbound.event5'",
          transform: { eventDataTemplate: { title: 'sibling_done' } },
          publish: { to: ['sibling_recipient'] },
          transition: { name: '$terminate' },
        },
      },
    ],
  },
];

const childDefaultPatterns: PatternModel[] = [
  {
    name: 'Default Spawn Parent',
    id: 'default_spawn_parent',
    instanceInterval: 0,
    maxInstances: 0,
    reactions: [
      {
        name: 'start',
        condition: {
          type: 'filter',
          xpr: "$event.type = 'inbound.event0'",
          transform: { eventDataTemplate: { title: 'default_parent_started' } },
          publish: { to: ['parent_recipient'] },
          spawn: {
            names: ['default_spawn_target'],
            input: 'default',
            type: 'child',
          },
        },
      },
      {
        name: 'parent_final',
        condition: {
          type: 'filter',
          xpr: "$event.type = 'inbound.event2'",
          transform: { eventDataTemplate: { title: 'default_parent_terminating' } },
          publish: { to: ['parent_recipient'] },
          transition: { name: '$terminate' },
        },
      },
    ],
  },
  {
    name: 'Default Spawn Target',
    id: 'default_spawn_target',
    instanceInterval: 0,
    maxInstances: 0,
    reactions: [
      {
        name: 'child_start',
        condition: {
          type: 'filter',
          xpr: "$event.type = 'inbound.event1'",
          transform: { eventDataTemplate: { title: 'default_child_started' } },
          publish: { to: ['child_recipient'] },
          transition: { name: '$terminate' },
        },
      },
    ],
  },
];

const childLocalPatterns: PatternModel[] = [
  {
    name: 'Local Spawn Parent',
    id: 'local_spawn_parent',
    instanceInterval: 0,
    maxInstances: 0,
    reactions: [
      {
        name: 'start',
        condition: {
          type: 'filter',
          xpr: "$event.type = 'inbound.event0'",
          transform: { eventDataTemplate: { title: 'local_parent_started' } },
          publish: { to: ['parent_recipient'] },
        },
      },
      {
        name: 'spawn_trigger',
        condition: {
          type: 'filter',
          xpr: "$event.type = 'inbound.event1'",
          onTrue: { xpr: "$setLocal('stored_event', $event)" },
          transform: { eventDataTemplate: { title: 'local_parent_spawning' } },
          publish: { to: ['parent_recipient'] },
          spawn: {
            names: ['local_spawn_target'],
            input: 'local',
            type: 'child',
            localName: 'stored_event',
          },
        },
      },
      {
        name: 'parent_final',
        condition: {
          type: 'filter',
          xpr: "$event.type = 'inbound.event2'",
          transform: { eventDataTemplate: { title: 'local_parent_terminating' } },
          publish: { to: ['parent_recipient'] },
          transition: { name: '$terminate' },
        },
      },
    ],
  },
  {
    name: 'Local Spawn Target',
    id: 'local_spawn_target',
    instanceInterval: 0,
    maxInstances: 0,
    reactions: [
      {
        name: 'child_start',
        condition: {
          type: 'filter',
          xpr: "$event.type = 'inbound.event1'",
          transform: { eventDataTemplate: { title: 'local_child_started' } },
          publish: { to: ['child_recipient'] },
          transition: { name: '$terminate' },
        },
      },
    ],
  },
];

const contextCopyPatterns: PatternModel[] = [
  {
    name: 'Context Copy Parent',
    id: 'context_copy_parent',
    instanceInterval: 0,
    maxInstances: 0,
    reactions: [
      {
        name: 'start',
        condition: {
          type: 'filter',
          xpr: "$event.type = 'inbound.event0'",
          onTrue: { xpr: "$setLocal('parent_data', {'key': 'value'}) & $setLocal('parent_counter', 42)" },
          transform: { eventDataTemplate: { title: 'ctx_parent_started' } },
          publish: { to: ['parent_recipient'] },
        },
      },
      {
        name: 'spawn_trigger',
        condition: {
          type: 'filter',
          xpr: "$event.type = 'inbound.event1'",
          transform: { eventDataTemplate: { title: 'ctx_parent_spawning' } },
          publish: { to: ['parent_recipient'] },
          spawn: {
            names: ['context_copy_target'],
            input: 'forward',
            type: 'child',
            context: true,
          },
        },
      },
      {
        name: 'parent_final',
        condition: {
          type: 'filter',
          xpr: "$event.type = 'inbound.event2'",
          transition: { name: '$terminate' },
        },
      },
    ],
  },
  {
    name: 'Context Copy Target',
    id: 'context_copy_target',
    instanceInterval: 0,
    maxInstances: 0,
    reactions: [
      {
        name: 'child_start',
        condition: {
          type: 'filter',
          xpr: "$event.type = 'inbound.event1'",
          transform: { eventDataTemplate: { title: 'ctx_child_started' } },
          publish: { to: ['child_recipient'] },
        },
      },
      {
        name: 'child_next',
        condition: {
          type: 'filter',
          xpr: "$event.type = 'inbound.event3'",
          transition: { name: '$terminate' },
        },
      },
    ],
  },
];

const missingPatternPatterns: PatternModel[] = [
  {
    name: 'Missing Pattern Parent',
    id: 'missing_pattern_parent',
    instanceInterval: 0,
    maxInstances: 0,
    reactions: [
      {
        name: 'start',
        condition: {
          type: 'filter',
          xpr: "$event.type = 'inbound.event0'",
          transform: { eventDataTemplate: { title: 'missing_parent_started' } },
          publish: { to: ['parent_recipient'] },
          spawn: {
            names: ['nonexistent_pattern'],
            input: 'forward',
            type: 'child',
          },
        },
      },
      {
        name: 'next',
        condition: {
          type: 'filter',
          xpr: "$event.type = 'inbound.event1'",
          transition: { name: '$terminate' },
        },
      },
    ],
  },
];
