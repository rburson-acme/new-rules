import { Persistence } from '../../persistence/Persistence.js';
import { PersistenceFactory } from '../../persistence/PersistenceFactory.js';
import { Message, Event, Events, errorKeys, EventValues } from '../../thredlib/index.js';
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
  private persistence: Persistence;
  private adapter: Adapter;

  constructor({ config, eventPublisher, additionalArgs }: MessageHandlerParams) {
    this.agentConfig = config;
    this.eventPublisher = eventPublisher;
    const dbname = additionalArgs?.dbname || this.agentConfig.customConfig?.dbname;
    this.persistence = PersistenceFactory.getPersistence(dbname);
    this.adapter = new PersistenceAdapter(this.persistence);
  }

  async initialize(): Promise<void> {
    await this.adapter.initialize();
  }

  async processMessage(message: Message): Promise<void> {
    // @TODO implement transactions for Persistence
    try {
      const result = await (this.adapter as PersistenceAdapter).execute(message.event);
      const outboundEvent = this.eventPublisher.createOutboundEvent({ prevEvent: message.event, content: { values: { result } } });
      await this.eventPublisher.publishEvent(outboundEvent);
    } catch (e) {
      const outboundEvent = this.eventPublisher.createOutboundEvent({
        error: { ...errorCodes[errorKeys.TASK_ERROR], cause: e },
        prevEvent: message.event,
      });
      await this.eventPublisher.publishEvent(outboundEvent);
    }
  }

  shutdown(): Promise<void> {
    return Promise.resolve();
  }
}

export default PersistenceAgent;
