import { Logger, Message, Event, StringMap, Events, EventError, errorCodes, errorKeys, EventContent } from '../thredlib/index.js';
import { EventQ } from '../queue/EventQ.js';
import { MessageQ } from '../queue/MessageQ.js';
import { QMessage } from '../queue/QService.js';
import { AgentConfig, Config } from './Config.js';
import { Id } from '../thredlib/core/Id.js';

export interface MessageHandler {
  initialize(): Promise<void>;
  processMessage(message: Message): Promise<void>;
  shutdown(): Promise<void>;
}

export interface MessageHandlerParams {
  config: AgentConfig;
  eventPublisher: EventPublisher;
  additionalArgs?: StringMap<any>;
}

export interface EventPublisher {
  publishEvent: (event: Event, sourceId?: string) => Promise<void>;
  createOutboundEvent: ({
    prevEvent,
    content,
    error,
  }: {
    prevEvent: Event;
    content?: any;
    error?: EventError['error'];
  }) => Event;
}

/**
  This framework class pulls Messages from the outbound MessageQ for a particular 'topic', which is
  defined in the agent configuration. The message is then provided to the MessageHandler's 'processMessage' method.
  The agent configuration also defines the agent's concrete implementation
  and starts an instance of the implementation. The processMessage method is called for each message pulled from the messageQ and passed
  to the instantiated agent (messageHandler) implementation to handle it.
  The 'publisher' provided to the agent implementation is used to send inbound Events to the Engine.
*/
export class Agent {
  private handler?: MessageHandler;
  readonly eventPublisher: EventPublisher;

  constructor(
    private agentConfig: AgentConfig,
    private eventQ: EventQ,
    private messageQ: MessageQ,
    private additionalArgs?: {},
  ) {
    this.eventPublisher = { publishEvent: this.publishEvent, createOutboundEvent: this.createOutboundEvent };
  }

  async start() {
    try {
      // agentImpl can be a string (dynamic import) or an object (direct instantiation)
      let Handler;
      if (typeof this.agentConfig.agentImpl === 'string') {
        const module = await import(this.agentConfig.agentImpl);
        Handler = module.default;
      } else {
        Handler = this.agentConfig.agentImpl;
      }
      this.handler = new Handler({
        config: this.agentConfig,
        eventPublisher: this.eventPublisher,
        additionalArgs: this.additionalArgs,
      });
      await this.handler?.initialize();
      Logger.trace(`Agent.start(): ${this.agentConfig.nodeId} initialized.`);
      this.run();
    } catch (e) {
      Logger.error('Agent.start(): failed to start the agent', e);
      throw e;
    }
  }

  // process Message from the Engine
  async processMessage(message: Message): Promise<void> {
    Logger.trace(`Agent.processMessage()`, message);
    return this.handler?.processMessage(message);
  }

  async shutdown(): Promise<void> {
    return this.handler?.shutdown();
  }

  // publish Events to engine
  publishEvent = async (event: Event, sourceId?: string): Promise<void> => {
    Logger.trace('Agent.publishEvent(): ', event.id, ` published by ${sourceId} @ ${Config.agentConfig.nodeId}`);
    return this.eventQ.queue(event);
  };

  /*
        Begin pulling Messages from the Q to publish outbound to participants
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
        try {
          const outboundEvent = this.eventPublisher.createOutboundEvent({
            error: { ...errorCodes[errorKeys.TASK_ERROR], cause: e },
            prevEvent: qMessage.payload.event,
          });
          await this.eventPublisher.publishEvent(outboundEvent);
          await this.messageQ.reject(qMessage, e as Error).catch(Logger.error);
          // @TODO figure out on what types of Errors it makes sense to requeue
          // await this.messageQ.requeue(qMessage, e).catch(Logger.error);
        } catch (e) {
          Logger.error(`Agent: failed to publish error event for message ${qMessage.payload?.id}`, e);
        }
      }
    }
  }

  private createOutboundEvent = <T>({
    prevEvent,
    content,
    error,
  }: {
    prevEvent: Event;
    content?: EventContent;
    error?: EventError['error'];
  }) => {
    const _content = error ? { error } : content;

    return Events.newEvent({
      id: Id.getNextId(this.agentConfig.nodeId),
      type: `org.wt.${this.agentConfig.nodeType}`,
      re: prevEvent.id,
      data: {
        title: `${this.agentConfig.nodeId} Result`,
        content: _content,
      },
      source: { id: this.agentConfig.nodeId, name: this.agentConfig.name },
      thredId: prevEvent.thredId,
    });
  };
}
