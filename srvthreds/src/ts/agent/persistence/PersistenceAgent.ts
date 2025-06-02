import { Persistence } from '../../persistence/Persistence.js';
import { PersistenceFactory } from '../../persistence/PersistenceFactory.js';
import { Message, Event, Events, errorKeys, EventValues, EventThrowable } from '../../thredlib/index.js';
import { Adapter } from '../adapter/Adapter.js';
import { EventPublisher, MessageHandler, MessageHandlerParams } from '../Agent.js';
import { AgentConfig } from '../Config.js';
import { PersistenceAdapter } from './PersistenceAdapter.js';
import { errorCodes } from '../../thredlib/index.js';

export interface PersistenceAgentConfig {}
export interface PersistenceAgentArgs {}

export class PersistenceAgent implements MessageHandler {
  private agentConfig: AgentConfig;
  // publish (inbound) events to the engine
  private eventPublisher: EventPublisher;
  private adapter: Adapter;

  constructor({ config, eventPublisher, additionalArgs }: MessageHandlerParams) {
    this.agentConfig = config;
    this.eventPublisher = eventPublisher;
    const hostString = additionalArgs?.hostString || this.agentConfig.customConfig?.hostString;
    const dbname = additionalArgs?.dbname || this.agentConfig.customConfig?.dbname;
    this.adapter = new PersistenceAdapter({ dbname, hostString });
  }

  /**
   * Initialize the agent.
   * Called once by the Agent upon startup
   */
  async initialize(): Promise<void> {
    await this.adapter.initialize();
  }

  /**
   * Process an inbound message from the Q.
   * The result should be published to engine using the eventPublisher.
   * An EventThrowable should be thrown if there is an error processing the message.
   * @param message
   * @returns {Promise<void>}
   * @throws {EventThrowable} if there is an error processing the message
   */
  async processMessage(message: Message): Promise<void> {
    try {
      const result = await (this.adapter as PersistenceAdapter).execute(message.event);
      const outboundEvent = this.eventPublisher.createOutboundEvent({
        prevEvent: message.event,
        content: { values: { result } },
      });
      await this.eventPublisher.publishEvent(outboundEvent);
    } catch (e) {
      throw EventThrowable.get({
        message: `PersistenceAgent: Error processing message ${message}`,
        code: errorCodes[errorKeys.TASK_ERROR].code,
        cause: e,
      });
    }
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
