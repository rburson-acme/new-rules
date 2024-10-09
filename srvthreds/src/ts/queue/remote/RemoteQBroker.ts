import rascal, { BrokerAsPromised } from 'rascal';
import baseConfig from '../../config/rascal_config.json' with { type: 'json' };
import { Logger } from '../../thredlib/index.js';

/*
    Allow 1 message at a time (via current rascal config 'prefetch').
    Next message will not be delivered until current message is ack'd.
    This should allow for a more perfect distribution across nodes. However, it has the most network overhead.
*/
export class RemoteQBroker {

    broker?: BrokerAsPromised;
    
    constructor(private config?: any) { 
        if(!config) {
            this.config = baseConfig as any;
        }
    }

    async connect(): Promise<void> {
        const withDefaults = rascal.withDefaultConfig(this.config as any);
        await rascal.BrokerAsPromised.create(withDefaults).then(broker => {
            this.broker = broker;
            this.broker.on('error', Logger.error);
        });
    }

    get isConnected(): boolean {
        return this.broker !== undefined;
    }

   /*
        Remove all remote messages
    */
  async deleteAll(): Promise<void> {
    await this.broker?.purge();
  }

  async unsubscribeAll(): Promise<void> {
    await this.broker?.unsubscribeAll();
  }

    async disconnect(): Promise<void> {
        await this.broker?.unsubscribeAll();
        await this.broker?.shutdown();
        this.broker = undefined;
    }

}