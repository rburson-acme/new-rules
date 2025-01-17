import { Event, Logger } from 'thredlib';
import rootStore from './app/ts/store/rootStore';

// test hooks

// const userId = 'cBucket';
// const userId = 'bOompa';
// rootStore.authStore.setUserId(userId);
// rootStore.authStore.setName('Charlie Bucket');
rootStore.authStore.setName('Workthreds User');

/*const testEvents = require('./mocks/test_events.json');
try {
    testEvents.forEach(rootStore.thredsStore.consume as never);
} catch(e) {
    Logger.error(e);
}*/
