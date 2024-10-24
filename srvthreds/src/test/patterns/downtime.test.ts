import { PatternModel, Logger, LoggerLevel, Event } from '../../ts/thredlib/index.js';
import { EngineConnectionManager, withDispatcherPromise, withReject } from '../testUtils.js';
import patternModel from '../../ts/config/patterns/downtime.pattern.json';
const patternModels: PatternModel[] = [patternModel as PatternModel];

Logger.setLevel(LoggerLevel.INFO);

describe('engine', function () {
  beforeAll(async () => {
    connMan = await EngineConnectionManager.newEngineInstance(patternModels);
    await connMan.purgeAll();
  });
  // test an incoming event that doesn't not match any pattern
  it('inbound unknown event', async function () {
    //direct call so that we can synchronize result
    await connMan.engine.consider(events.noMatch);
    expect(connMan.engine.numThreds).toBe(0);
  });
  // should match pattern's first reaction, start a thred, send event to erp, send event to operator
  // set test thredId to this thred
  // 2 reactions via input: forward
  it('inbound inception event', function () {
    const pr = new Promise<void>((resolve, reject) => {
      connMan.engine.dispatchers = [
        withReject((message) => {
          expect(connMan.engine.numThreds).toBe(1);
          expect(message.to).toContain('wonkaInc.erp.agent');
          expect(message.event.data?.title).toBe('New Reporting Entry: Widget Jam - ERP');
          thredId = message.event.thredId;
          connMan.engine.dispatchers = [
            withReject((message) => {
              expect(connMan.engine.numThreds).toBe(1);
              expect(message.to).toContain('bOompa');
              expect(message.event.data?.description).toBe('Gobstopper Assembly 339 has failed with a Widget Jam');
              expect(message.event.data?.advice.template.name).toBe('operator_create_workorder');
              resolve();
            }, reject),
          ];
        }, reject),
      ];
    });
    connMan.eventQ.queue(events.intitialEvent);
    return pr;
  });
  // should match pattern's first reaction and create another, independent thred
  it('inbound another inception event', function () {
    const pr = withDispatcherPromise(connMan.engine.dispatchers, (message) => {
      expect(connMan.engine.numThreds).toBe(2);
      thredId2 = message.event.thredId;
      expect(thredId2).not.toBe(thredId);
    });
    connMan.eventQ.queue(events.intitialEvent);
    return pr;
  });
  // should terminate thred (1 thred remaining)
  it('inbound should not create work order event', async function () {
    //direct call so that we can synchronize result
    await connMan.engine.consider({ ...events.shouldNotCreateWorkOrder, thredId });
    expect(connMan.engine.numThreds).toBe(1);
    expect((connMan.engine.thredsStore as any).thredStores[thredId as any]).toBeUndefined();
  });
  // should match pattern's first reaction, start a thred, send event to erp, send event to operator
  // set test thredId to this thred
  // 2 reactions via input: forward
  it('inbound inception event (new thred)', function () {
    const pr = new Promise<void>((resolve, reject) => {
      connMan.engine.dispatchers = [
        withReject((message) => {
          expect(connMan.engine.numThreds).toBe(2);
          expect(message.to).toContain('wonkaInc.erp.agent');
          expect(message.event.data?.title).toBe('New Reporting Entry: Widget Jam - ERP');
          thredId = message.event.thredId;
          connMan.engine.dispatchers = [
            withReject((message) => {
              expect(connMan.engine.numThreds).toBe(2);
              expect(message.to).toContain('bOompa');
              expect(message.event.data?.description).toBe('Gobstopper Assembly 339 has failed with a Widget Jam');
              expect(message.event.data?.advice.template.name).toBe('operator_create_workorder');
              resolve();
            }, reject),
          ];
        }, reject),
      ];
    });
    connMan.eventQ.queue(events.intitialEvent);
    return pr;
  });
  // should publish event to cmms to create work order
  it('inbound should create work order event', function () {
    const pr = withDispatcherPromise(connMan.engine.dispatchers, (message) => {
      expect(message.to).toContain('wonkaInc.cmms.agent');
      expect(message.event.data?.content.tasks[0].params.values.name).toBe('Widget Jam');
      expect(message.event.data?.content.tasks[0].params.values.submittedBy).toBe('bOompa');
      expect(message.event.data?.content.tasks[0].params.values.code).toBe('EC_1034');
      expect(message.event.data?.content.tasks[0].params.values.location).toBe('Gobstopper Assembly 339');
    });
    connMan.eventQ.queue({ ...events.shouldCreateWorkOrder, thredId });
    return pr;
  });
  // should publish work order created event to operator (this tests publish expr with a locally scoped variable)
  // should forward to next reaction which should publish availableTechnician query to rms agent
  // 2 reactions via input: forward
  it('inbound workorder created', function () {
    const pr = new Promise<void>((resolve, reject) => {
      connMan.engine.dispatchers = [
        withReject((message) => {
          expect(message.to).toContain('bOompa');
          expect(message.event.data?.title).toBe('Work order has been created');
          connMan.engine.dispatchers = [
            withReject((message) => {
              expect(message.to).toContain('wonkaInc.rms.agent');
              expect(message.event.data?.content.tasks[0].params.values.code).toBe('EC_1034');
              expect(message.event.data?.content.tasks[0].params.values.location).toBe('Gobstopper Assembly 339');
              resolve();
            }, reject),
          ];
        }, reject),
      ];
    });
    connMan.eventQ.queue({ ...events.workOrderCreated, thredId });
    return pr;
  });
  // should send first available technician a request, based on rms result
  it('inbound available technicians', function () {
    const pr = withDispatcherPromise(connMan.engine.dispatchers, (message) => {
      expect(message.to).toContain('fLoompa');
      expect(message.event.data?.description).toBe('Gobstopper Assembly 339 has failed with a Widget Jam');
      expect(message.event.data?.advice.template.name).toBe('technician_accept_work');
    });
    connMan.eventQ.queue({ ...events.availableTechnicians, thredId });
    return pr;
  });
  // should publish to rms that technician declined and should be marked 'busy' and re-query
  // transition back to earlier reaction (wait for rms response)
  it('inbound technician not accept', function () {
    const pr = withDispatcherPromise(connMan.engine.dispatchers, (message) => {
      expect(message.to).toContain('wonkaInc.rms.agent');
      expect(message.event.data?.content.tasks[0].name).toBe('technicianUnavailable');
      expect(message.event.data?.content.tasks[0].params.values.id).toBe('fLoompa');
      expect(message.event.data?.content.tasks[0].params.values.unavailableAt).toBeDefined();
      expect(message.event.data?.content.tasks[1].name).toBe('availableTechnicians');
      expect(message.event.data?.content.tasks[1].params.values.code).toBe('EC_1034');
    });
    connMan.eventQ.queue({ ...events.notAcceptWork, thredId });
    return pr;
  });
  // should send first available technician a request, based on rms result (different technician)
  it('inbound available technicians with last result excluded', function () {
    const pr = withDispatcherPromise(connMan.engine.dispatchers, (message) => {
      expect(message.to).toContain('cBucket');
      expect(message.event.data?.description).toBe('Gobstopper Assembly 339 has failed with a Widget Jam');
      expect(message.event.data?.advice.template.name).toBe('technician_accept_work');
    });
    connMan.eventQ.queue({ ...events.availableTechnicians2, thredId });
    return pr;
  });
  // technician accepts, rms is notified of unavailable userId, cms work order is updated
  it('inbound technician accept', function () {
    const pr = new Promise<void>((resolve, reject) => {
      connMan.engine.dispatchers = [
        withReject((message) => {
          expect(message.to).toContain('wonkaInc.rms.agent');
          expect(message.event.data?.content.tasks[0].name).toBe('technicianUnavailable');
          expect(message.event.data?.content.tasks[0].params.values.id).toBe('cBucket');
          expect(message.event.data?.content.tasks[0].params.values.unavailableAt).toBeDefined();
          connMan.engine.dispatchers = [
            withReject((message) => {
              expect(message.to).toContain('wonkaInc.cmms.agent');
              expect(message.event.data?.content.tasks[0].params.values.id).toBe('3939');
              resolve();
            }, reject),
          ];
        }, reject),
      ];
    });
    connMan.eventQ.queue({ ...events.acceptWork, thredId });
    return pr;
  });
  // work order is created, notify the technician that the work order has been updated
  it('inbound work order updated', async function () {
    const pr = withDispatcherPromise(connMan.engine.dispatchers, (message) => {
      expect(message.to).toContain('cBucket');
      expect(message.event.data?.description).toBe('You have been assigned to work order 3939');
    });
    await connMan.engine.consider({ ...events.workOrderUpdated, thredId });
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
let thredId2: string | undefined;
let connMan: EngineConnectionManager;

const events: Record<string, Event> = {
  noMatch: {
    id: '001',
    type: 'unknown.event',
    time: 1584887617722,
    data: {
      description: 'Unknown Event',
      content: {
        values: {
        errorCode: 'Dang'
        }
      },
    },
    source: {
      id: 'assembly-84',
      name: 'Broom Repair Station',
    },
  },
  intitialEvent: {
    id: '100',
    type: 'wonkaInc.downtime',
    time: 1584887617722,
    data: {
      description: 'Widget Jam',
      content: {
        values: {
        errorCode: 'EC_1034',
        }
      },
    },
    source: {
      id: 'assembly-10',
      name: 'Gobstopper Assembly 339',
    },
  },
  shouldNotCreateWorkOrder: {
    id: '120',
    type: 'wonkaInc.operator',
    time: 1584887617722,
    data: {
      content: {
        values: {
          operator_response: false,
        },
      },
    },
    source: {
      id: 'bOompa',
      name: 'Bob Oompa',
    },
  },
  shouldCreateWorkOrder: {
    id: '125',
    type: 'wonkaInc.operator',
    time: 1584887617722,
    data: {
      content: {
        values: {
          operator_response: true,
        },
      },
    },
    source: {
      id: 'bOompa',
      name: 'Bob Oompa',
    },
  },
  workOrderCreated: {
    id: '130',
    type: 'wonkaInc.cmms.failureWorkOrder.created',
    time: 1584887617722,
    data: {
      content: {
        values: {
          id: '3939',
          name: 'Widget Jam',
          code: 'EC_1034',
          location: 'Gobstopper Assembly 339',
        },
      },
    },
    source: {
      id: 'wonkaInc.cmms.agent',
      name: 'Workthreds Wonka Inc. CMMS Agent',
    },
  },
  availableTechnicians: {
    id: '134',
    type: 'wonkaInc.rms.availableResources',
    time: 1584887617722,
    data: {
      content: {
        values: {
          availableTechnicians: [
            { id: 'fLoompa', name: 'Fernando Loompa' },
            { id: 'cBucket', name: 'Charlie' },
          ],
        },
      },
    },
    source: {
      id: 'wonkaInc.rms.agent',
      name: 'Workthreads Workforce Management Agent',
    },
  },
  notAcceptWork: {
    id: '140',
    type: 'wonkaInc.technician',
    time: 1584887617722,
    data: {
      content: {
        values: {
          technician_response: false,
        },
      },
    },
    source: {
      id: 'fLoompa',
      name: 'Fernando Loompa',
    },
  },
  availableTechnicians2: {
    id: '145',
    type: 'wonkaInc.rms.availableResources',
    time: 1584887617722,
    data: {
      content: {
        values: {
          availableTechnicians: [{ id: 'cBucket', name: 'Charlie' }],
        },
      },
    },
    source: {
      id: 'wonkaInc.rms.agent',
      name: 'Workthreads Workforce Management Agent',
    },
  },
  acceptWork: {
    id: '150',
    type: 'wonkaInc.technician',
    time: 1584887617722,
    data: {
      content: {
        values: {
          technician_response: true,
        },
      },
    },
    source: {
      id: 'cBucket',
      name: 'Charilie Bucket',
    },
  },
  workOrderUpdated: {
    id: '155',
    type: 'wonkaInc.cmms.failureWorkOrder.updated',
    time: 1584887617722,
    data: {
      content: {
        values: {
          id: '3939',
          name: 'Widget Jam',
          code: 'EC_1034',
          location: 'Gobstopper Assembly 339',
          assignedTo: 'cBucket',
        },
      },
    },
    source: {
      id: 'wonkaInc.cmms.agent',
      name: 'Workthreds Wonka Inc. CMMS Agent',
    },
  },
};
