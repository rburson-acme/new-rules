import rascal, { BrokerAsPromised } from 'rascal';
import { errorCodes, EventThrowable, Logger } from '../../thredlib/index.js';
import { RascalConfig } from '../../config/RascalConfig.js';
import { ConfigManager } from '../../config/ConfigManager.js';

/*
    Allow 1 message at a time (via current rascal config 'prefetch').
    Next message will not be delivered until current message is ack'd.
    This should allow for a more perfect distribution across nodes. However, it has the most network overhead.
*/
export class RemoteQBroker {
  broker?: BrokerAsPromised;

  constructor() {}

  async connect(): Promise<void> {
    const config = ConfigManager.get().getConfig<RascalConfig>('rascal-config');
    if (!config || !config.configDef) throw Error('Rascal config not loaded by ConfigurationManager');
    const withDefaults = rascal.withDefaultConfig(config.configDef);
    await rascal.BrokerAsPromised.create(withDefaults).then((broker) => {
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
