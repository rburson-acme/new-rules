import '../../ts/init.js';
import { EventBuilder, EventManager, Events, Logger, LoggerLevel } from '../../ts/thredlib/index.js';

/**
 * This is intended to run against the client_async_test.pattern.js pattern
 */

const eventManager0 = new EventManager();
const eventManager1 = new EventManager();
const eventManager2 = new EventManager();
const eventManager3 = new EventManager();
const eventManager4 = new EventManager();

Logger.setLevel(LoggerLevel.TRACE);

function createSyncEvent(
  seqId: number,
  action: string,
  source: { id: string; name: string },
  thredId: string | undefined,
): any {
  return EventBuilder.create({
    type: 'org.async.event',
    source,
    thredId,
  })
    .mergeValues({ seqId })
    .mergeValues({ action })
    .mergeData({ title: 'Sync Event' })
    .build();
}

function createFinishEvent(source: { id: string; name: string }, thredId: string | undefined): any {
  return EventBuilder.create({
    type: 'org.async.event',
    source,
    thredId,
  })
    .mergeValues({ action: 'finish' })
    .mergeData({ title: 'Finish Event' })
    .build();
}

async function runAsyncTest(numIterations: number = 100): Promise<void> {
  Logger.info('Starting Async Test');
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

  await eventManager2
    .connect('http://localhost:3000', { transports: ['websocket'], jsonp: false, auth: { token: 'participant2' } })
    .catch((e) => {
      Logger.error(e);
    });
  await eventManager3
    .connect('http://localhost:3000', { transports: ['websocket'], jsonp: false, auth: { token: 'participant3' } })
    .catch((e) => {
      Logger.error(e);
    });
  await eventManager4
    .connect('http://localhost:3000', { transports: ['websocket'], jsonp: false, auth: { token: 'participant4' } })
    .catch((e) => {
      Logger.error(e);
    });

  const pr1 = getAsyncPromise(eventManager0, 'participant0', 'Participant 0', numIterations);
  const pr2 = getAsyncPromise(eventManager1, 'participant1', 'Participant 1', numIterations);
  const pr3 = getAsyncPromise(eventManager2, 'participant2', 'Participant 2', numIterations);
  const pr4 = getAsyncPromise(eventManager3, 'participant3', 'Participant 3', numIterations);
  const pr5 = getAsyncPromise(eventManager4, 'participant4', 'Participant 4', numIterations);
  await Promise.all([pr1, pr2, pr3, pr4, pr5]);
}

function getAsyncPromise(eventManager: EventManager, id: string, name: string, numIterations: number): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    (async () => {
      try {
        let thredId: string | undefined = undefined;
        const firstSyncEvent = createSyncEvent(0, 'seq', { id, name }, undefined);
        const firstReponseEvent = await eventManager.subscribeOnceWithPromise(
          { filter: `$valueNamed('seqId') = 0` },
          firstSyncEvent,
        );
        thredId = firstReponseEvent.thredId;
        Logger.debug(
          `${name} seqId:0 Result: ${Events.valueNamed(firstReponseEvent, 'seqId')} ThredId: ${firstReponseEvent.thredId}`,
        );
        const prArray = Array.from({ length: numIterations - 1 }, (_, i) => {
          const it = i + 1;
          const syncEvent = createSyncEvent(it, 'seq', { id, name }, thredId);
          const pr = eventManager.subscribeOnceWithPromise({ filter: `$valueNamed('seqId') = ${it}` }, syncEvent);
          return pr
            .then((event) => {
              Logger.debug(
                `${name} seqId:${it} Result: ${Events.valueNamed(event, 'seqId')} ThredId: ${event.thredId}`,
              );
            })
            .catch((e) => {
              throw e;
            });
        });
        await Promise.all(prArray);
        const finishEvent = createFinishEvent({ id, name }, thredId);
        const resultEvent = await eventManager.subscribeOnceWithPromise(
          { filter: `$thredId = '${thredId}'` },
          finishEvent,
        );
        Logger.debug(`${name} received finish event with seqIds ${Events.valueNamed(resultEvent, 'seqIds')}`);
        const resultSeqIds: number[] = Events.valueNamed(resultEvent, 'seqIds');
        for (let i = 0; i < numIterations; i++) {
          if (!resultSeqIds.includes(i)) {
            throw new Error(`${name}: Missing seqId ${i} in result seqIds ${resultSeqIds}`);
          }
        }
        resolve();
      } catch (e) {
        reject(e);
      }
    })();
  });
}

const startTime = Date.now();
await runAsyncTest()
  .catch((e) => {
    Logger.error('Test Failed', e);
    process.exit(1);
  })
  .finally(() => {
    const endTime = Date.now();
    Logger.info(`Sync Test completed in ${(endTime - startTime) / 1000} seconds`);
    eventManager0.disconnect();
    eventManager1.disconnect();
    eventManager2.disconnect();
    eventManager3.disconnect();
    eventManager4.disconnect();
  });
Logger.info('Test succeeded');
