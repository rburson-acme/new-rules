import { Message, errorKeys, EventThrowable } from '../../thredlib/index.js';
import { Adapter } from '../adapter/Adapter.js';
import { EventPublisher, MessageHandler, MessageHandlerParams } from '../AgentService.js';
import { AgentConfig } from '../../config/AgentConfig.js';
import { errorCodes } from '../../thredlib/index.js';

export abstract class BaseAgent implements MessageHandler {
  protected agentConfig: AgentConfig;
  // publish (inbound) events to the engine
  protected eventPublisher: EventPublisher;
  protected adapter: Adapter;

  constructor({ config, eventPublisher, adapter }: MessageHandlerParams) {
    this.agentConfig = config;
    this.eventPublisher = eventPublisher;
    if (!adapter) {
      throw new Error('Adapter is required for BaseAgent');
    }
    this.adapter = adapter;
  }

  /**
   * Initialize the agent.
   * Called once by the Agent upon startup
   */
  async initialize(): Promise<void> {
    await this.adapter.initialize();
  }

  /**
   * Process an inbound message from the engine.
   * The result should be published to engine using the eventPublisher.
   * An EventThrowable should be thrown if there is an error processing the message.
   * @param message
   * @returns {Promise<void>}
   * @throws {EventThrowable} if there is an error processing the message
   */
  async processMessage(message: Message): Promise<void> {
    try {
      const result = await this.adapter.execute(message.event);
      const outboundEvent = this.eventPublisher.createOutboundEvent({
        prevEvent: message.event,
        content: { values: { result } },
      });
      await this.eventPublisher.publishEvent(outboundEvent);
    } catch (e) {
      throw EventThrowable.get({
        message: `BaseAgent: Error processing message ${message}`,
        code: errorCodes[errorKeys.TASK_ERROR].code,
        cause: e,
      });
    }
  }

  /**
   * Perform any cleanup or shutdown tasks for the agent.
   * @returns {Promise<void>}
   */
  abstract shutdown(): Promise<void>;
}

export default BaseAgent;
