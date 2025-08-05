import { MessageHandlerParams } from '../Agent.js';
import { PersistenceAdapter } from './PersistenceAdapter.js';
import BaseAgent from '../base/BaseAgent.js';

// this defines the customConfig and additionalArgs that can be passed to the PersistenceAgent
export interface PersistenceAgentConfig {
  hostString?: string;
  dbname?: string;
}
export interface PersistenceAgentArgs {
  hostString?: string;
  dbname?: string;
}

export class PersistenceAgent extends BaseAgent {
  constructor({ config, eventPublisher, additionalArgs }: MessageHandlerParams) {
    super({
      config,
      eventPublisher,
      additionalArgs,
      adapter: new PersistenceAdapter({
        hostString: additionalArgs?.hostString || config.customConfig?.hostString,
        dbname: additionalArgs?.dbname || config.customConfig?.dbname,
      }),
    });
  }

  /**
   * Perform any cleanup or shutdown tasks for the agent.
   * @returns {Promise<void>}
   */
  shutdown(): Promise<void> {
    return Promise.resolve();
  }
}

export default PersistenceAgent;
