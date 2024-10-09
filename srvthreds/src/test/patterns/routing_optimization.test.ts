import { PatternModel, Logger, LoggerLevel } from '../../ts/thredlib/index.js';
import { EngineConnectionManager, withDispatcherPromise, withReject } from '../testUtils.js';
import patternModel from '../../ts/config/patterns/routing_optimization.pattern.json';
const patternModels: PatternModel[] = [patternModel as PatternModel];
Logger.setLevel(LoggerLevel.INFO);

describe('Routing Optimization Test', function () {
  beforeAll(async () => {
    connMan = await EngineConnectionManager.newEngineInstance(patternModels);
    await connMan.purgeAll();
  });
  it('inbound mes operation', function () {
    const pr = new Promise<void>((resolve, reject) => {
      connMan.engine.dispatchers = [
        withReject((message) => {
          expect(connMan.engine.numThreds).toBe(1);
          const data = message.event.data;
          expect(message.to).toContain('mes.database');
          expect(data?.title).toBe('Query Past MES Operations');
          expect(data?.description).toBe('Query MES for operation 2');
          expect(data?.content.values.tasks[0][0].params.query.matcher.mes_op_sequence).toBe('2');
          thredId = message.event.thredId;
          connMan.engine.dispatchers = [
            withReject((message) => {
              expect(connMan.engine.numThreds).toBe(1);
              const data = message.event.data;
              expect(message.to).toContain('customer.erp');
              expect(data?.title).toBe('ERP Query');
              expect(data?.description).toBe('Query ERP for heatlot = 2');
              expect(data?.content.values.tasks[0][0].params.query.matcher.heatlot).toBe('2');
              resolve();
            }, reject),
          ];
        }, reject),
      ];
    });
    connMan.eventQ.queue(events.newMesOp);
    return pr;
  });
  it('wait for mes data and heatlot data', function () {
    const pr = withDispatcherPromise(connMan.engine.dispatchers,
      (message) => {
        expect(connMan.engine.numThreds).toBe(1);
        const data = message.event.data;
        expect(message.to).toContain('pat');
        expect(data?.title).toBe('Operation Recommendations');
        const firstInteraction = data?.content?.advice?.template?.interactions?.[0].interaction;
        expect(firstInteraction?.content?.[0].text.value).toBe(
          'This heatlot contains 1.8% zinc, 4.5% iron, 0.059% lead',
        );
        expect(firstInteraction?.content?.[1].text.value).toBe(
          'The most successful run for this heat lot had the following settings: \npressure: 1145, temp: 570',
        );
      },
    );
    connMan.eventQ.queue({ ...events.programHistoryResult, thredId });
    connMan.eventQ.queue({ ...events.heatlotResult, thredId });
    return pr;
  });
  it('wait for response ack', function () {
    const pr = withDispatcherPromise(connMan.engine.dispatchers,
      (message) => {
        expect(connMan.engine.numThreds).toBe(1);
        const data = message.event.data;
        expect(message.to).toContain('pat');
        expect(data?.title).toBe('Thanks.');
        expect(data?.description).toBe('Your response will be logged.');
      },
    );
    connMan.eventQ.queue({ ...events.operatorResponse, thredId });
    pr;
  });
  // cleanup in case of failure
  afterAll(async () => {
    await connMan.stopAllThreds();
    await connMan.purgeAll();
    await connMan.disconnectAll();
  });
});

let thredId: string | undefined;
let connMan: EngineConnectionManager;

const events = {
  newMesOp: {
    id: 'mesEvent_1',
    type: 'mes.newOperation',
    data: {
      title: 'A new MES routing operation has been started',
      description: 'MES reports a new routing operation, mesOpSequence: 2 and heatlot #2',
      content: {
        values: {
          mesOpSequence: '2',
          heatlot: '2',
        },
      },
    },
    source: {
      id: 'mesSystem1',
      name: 'MES System',
    },
  },
  programHistoryResult: {
    id: 'org.wt.persistence.100',
    type: 'org.wt.persistence.op',
    data: {
      content: {
        values: {
          find_past_ops: [
            { date: '02/27/2020', ovr_pressure: 1145, ovr_temp: 570, qty_good: 12, qty_scrap: 2 },
            { date: '03/29/2020', ovr_pressure: 1160, ovr_temp: 560, qty_good: 8, qty_scrap: 4 },
          ],
        },
      },
    },
    source: {
      id: 'mes.database',
      name: 'MES System (Persistence)',
    },
  },
  heatlotResult: {
    id: 'customer.erp.23',
    type: 'customer.erp.result',
    data: {
      content: {
        values: {
          find_heatlot: [{ heatlot: '2', zinc: 1.8, iron: 4.5, lead: 0.059 }],
        },
      },
    },
    source: {
      id: 'customer.erp',
      name: 'MES System (Persistence)',
    },
  },
  operatorResponse: {
    id: 'customer.operator.84',
    type: 'customer.operator',
    data: {
      content: {
        type: 'operator_recommendations',
        values: {
          operator_response: true,
        },
      },
    },
    source: {
      id: 'pat',
      name: 'Pat',
    },
  },
};
