import { Logger, Message, Event, StringMap } from '../thredlib/index.js';
import { EventQ } from '../queue/EventQ.js';
import { MessageQ } from '../queue/MessageQ.js';
import { QMessage } from '../queue/QService.js';
import { AgentConfig, Config } from './Config.js';

export interface MessageHandler {
  processMessage(message: Message): Promise<void>;
  shutdown(): Promise<void>;
}

export interface MessageHandlerParams {
  config: AgentConfig;
  publisher: (event: Event, participantId: string) => Promise<void>;
  additionalArgs?: StringMap<any>;
}

export class Agent {
  private handler?: MessageHandler;

  constructor(
    private agentConfig: AgentConfig,
    private eventQ: EventQ,
    private messageQ: MessageQ,
    private additionalArgs?: {},
  ) {}

  async start() {
    try {
      // agentImpl can be a string (dynamic import) or an object (direct instantiation)
      let Handler;
      if(typeof this.agentConfig.agentImpl === 'string') {
        const module = await import(this.agentConfig.agentImpl);
        Handler = module.default;
      } else {
        Handler = this.agentConfig.agentImpl;
      }
      this.handler = new Handler({
        config: this.agentConfig,
        publisher: this.publishEvent,
        additionalArgs: this.additionalArgs,
      });
      this.run();
    } catch (e) {
      Logger.error('Agent.start(): failed to start the agent', e);
      throw e;
    }
  }

  // outbound to agent / inbound to engine
  publishEvent = async (event: Event, participantId: string): Promise<void> => {
    Logger.trace('Agent.publishEvent(): ', event.id, ` published by ${participantId} @ ${Config.agentConfig.nodeId}`);
    return this.eventQ.queue({ ...event, source: { id: participantId } });
  };

  /*
        Begin pulling Messages from the Q
    */
  private async run() {
    while (true) {
      const topics = [Config.agentConfig.nodeId, Config.agentConfig.nodeType];
      const qMessage: QMessage<Message> = await this.messageQ.pop(topics);
      try {
        await this.processMessage(qMessage.payload);
        await this.messageQ.delete(qMessage);
      } catch (e) {
        Logger.error(`Agent: failed to process message ${qMessage.payload?.id}`, e);
        await this.messageQ.reject(qMessage, e as Error).catch(Logger.error);
        // @TODO figure out on what types of Errors it makes sense to requeue
        // await this.messageQ.requeue(qMessage, e).catch(Logger.error);
      }
    }
  }

  // inbound to agent
  async processMessage(message: Message): Promise<void> {
    Logger.trace(`Agent.processMessage()`, message);
    return this.handler?.processMessage(message);
  }

  async shutdown(): Promise<void> {
    return this.handler?.shutdown();
  }
}
