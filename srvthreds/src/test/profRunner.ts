import '../ts/init.js';
import { EventBuilder, EventManager, Events, Logger, LoggerLevel } from '../ts/thredlib/index.js';

const eventManager0 = new EventManager();
const eventManager1 = new EventManager();

function createSyncEvent(seqId: number, source: { id: string; name: string }, thredId: string | undefined): any {
  return EventBuilder.create({
    type: 'org.sync.event',
    source,
    thredId,
  })
    .mergeValues({ seqId })
    .mergeData({ title: 'Sync Event' })
    .build();
}

// must be run against 'sync_test.pattern.json'
async function runSyncTest() {
  Logger.info('Starting Sync Test');
  await eventManager0
    .connect('http://localhost:3000', { transports: ['websocket'], jsonp: false, auth: { token: 'participant0' } })
    .catch((e) => {
      Logger.error(e);
    });
  await eventManager1
    .connect('http://localhost:3000', { transports: ['websocket'], jsonp: false, auth: { token: 'participant1' } })
    .catch((e) => {
      Logger.error(e);
    });

  let thredId = undefined;
  for (let i = 0; i < 100; i++) {
    const syncEvent0 = createSyncEvent(i, { id: 'participant0', name: 'Participant 0' }, thredId);
    const result = await eventManager0.subscribeOnceWithPromise({ filter: `$valueNamed('seqId') = ${i}` }, syncEvent0);
    thredId = result.thredId;
    Logger.debug(`Sync Event ${i} Result: ${Events.valueNamed(result, 'seqId')} ThredId: ${result.thredId}`);
  }
}

/* 
    const syncEvent1 = createSyncEvent(i, { id: 'participant1', name: 'Participant 1' });
    eventManager1.publish(syncEvent1);
    */

const startTime = Date.now();
runSyncTest()
  .catch((e) => {
    Logger.error(e);
  })
  .finally(() => {
    const endTime = Date.now();
    Logger.info(`Sync Test completed in ${(endTime - startTime) / 1000} seconds`);
  });
