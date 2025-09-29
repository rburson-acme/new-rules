import { PatternModel, Logger, LoggerLevel, Event } from '../../ts/thredlib/index.js';
import { EngineConnectionManager, withDispatcherPromise } from '../testUtils.js';
import patternModel from '../config/patterns/downtime_light.pattern.json' with { type: 'json' };
const patternModels: PatternModel[] = [patternModel as PatternModel];

Logger.setLevel(LoggerLevel.INFO);

describe('engine', function () {
  beforeAll(async () => {
    connMan = await EngineConnectionManager.newEngineInstance(patternModels);
    await connMan.purgeAll();
  });
  // should match pattern's first reaction, start a thred, send event to erp, send event to operator
  // set test thredId to this thred
  // 2 reactions via input: forward
  it('inbound inception event', function () {
    const pr = withDispatcherPromise(connMan.engine.dispatchers, async (message) => {
      thredId = message.event.thredId;
      expect(await connMan.engine.numThreds).toBe(1);
      expect(message.to).toContain('wonkaInc.rms.agent');
      expect(message.event.data?.content.tasks[0].params.matcher.code).toBe('EC_1034');
      expect(message.event.data?.content.tasks[0].params.matcher.location).toBe('Gobstopper Assembly 339');
    });
    connMan.eventQ.queue(events.intitialEvent);
    return pr;
  });
  // should send first available technician a request, based on rms result
  it('inbound available technicians', function () {
    const pr = withDispatcherPromise(connMan.engine.dispatchers, (message) => {
      expect(message.to).toContain('cBucket');
      expect(message.event.data?.description).toBe('Gobstopper Assembly 339 has failed with a Widget Jam');
      expect(message.event.data?.advice.template.name).toBe('technician_accept_work');
    });
    connMan.eventQ.queue({ ...events.availableResourcesResult, thredId });
    return pr;
  });
  // technician accepts, rms is notified of unavailable userId, technician is notified of the assignment
  it('inbound technician accept', function () {
    const pr = withDispatcherPromise(connMan.engine.dispatchers, (message) => {
      expect(message.to).toContain('wonkaInc.rms.agent');
      expect(message.event.data?.content.tasks[0].name).toBe('technicianUnavailable');
      expect(message.event.data?.content.tasks[0].params.values.id).toBe('cBucket');
      expect(message.event.data?.content.tasks[0].params.values.unavailableAt).toBeDefined();
      connMan.engine.dispatchers = [
        (message) => {
          expect(message.to).toContain('cBucket');
          expect(message.event.data?.description).toBe('You have been assigned to this task');
        },
      ];
    });
    connMan.eventQ.queue({ ...events.acceptWork, thredId });
    return pr;
  });
  // cleanup in case of failure
  afterAll(async () => {
    await connMan.stopAllThreds();
    await connMan.purgeAll();
    await connMan.disconnectAll();
  });
});

let connMan: EngineConnectionManager;

let thredId: string | undefined;

const events: Record<string, Event> = {
  intitialEvent: {
    id: '100',
    type: 'wonkaInc.downtime',
    time: 1584887617722,
    data: {
      description: 'Widget Jam',
      content: {
        values: {
          errorCode: 'EC_1034',
        },
      },
    },
    source: {
      id: 'assembly-10',
      name: 'Gobstopper Assembly 339',
    },
  },
  availableResourcesResult: {
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
};
