import { Logger } from '../thredlib/index.js';
import { PubSub } from './PubSub.js';
import { RedisPubSub } from './RedisPubSub.js';

export class PubSubFactory {

    private static pubsub?: PubSub;
    
    static getPubSub(): PubSub {
        if(!PubSubFactory.pubsub) {
            PubSubFactory.pubsub = new RedisPubSub();
        }
        return PubSubFactory.pubsub as never;
    }

    static async disconnectAll(): Promise<void> {
        try {
            await PubSubFactory.pubsub?.disconnect();
        }catch(e) {
            Logger.error(`disconnectAll: `, e);
        }
        PubSubFactory.pubsub = undefined;
    }

}