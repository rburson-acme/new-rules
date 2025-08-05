import {
  Logger,
  Message,
  Event,
  StringMap,
  Events,
  EventError,
  errorCodes,
  errorKeys,
  EventContent,
  serializableError,
} from '../thredlib/index.js';
import { EventQ } from '../queue/EventQ.js';
import { MessageQ } from '../queue/MessageQ.js';
import { QMessage } from '../queue/QService.js';
import { AgentConfig } from './Config.js';
import { Id } from '../thredlib/core/Id.js';
import { SystemController } from '../persistence/controllers/SystemController.js';
import { Adapter } from './adapter/Adapter.js';

export interface MessageHandler {
  initialize(): Promise<void>;
  processMessage(message: Message): Promise<void>;
  shutdown(): Promise<void>;
}

export interface MessageHandlerParams {
  config: AgentConfig;
  adapter?: Adapter;
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
  defined in the agent config. The message is then provided to the MessageHandler's 'processMessage' method.
  The agent config also specifies the agent's concrete implementation
  and starts an instance of the implementation. The processMessage method is called for each message pulled from the messageQ and passed
  to the instantiated agent (messageHandler) implementation to handle it.
  The 'publisher' provided to the agent implementation is used to send inbound Events to the Engine.
*/
export class Agent {
  private handler?: MessageHandler;
  private agentConfig?: AgentConfig;
  readonly eventPublisher: EventPublisher;

  constructor(
    private params: {
      configName: string;
      eventQ: EventQ;
      messageQ: MessageQ;
      agentConfig?: AgentConfig;
      additionalArgs?: {};
    },
  ) {
    this.eventPublisher = { publishEvent: this.publishEvent, createOutboundEvent: this.createOutboundEvent };
  }

  async start() {
    const { configName, additionalArgs } = this.params;
    // load config from persistence if not provided
    this.agentConfig = this.params.agentConfig
      ? this.params.agentConfig
      : await SystemController.get().getConfig(configName);
    if (!this.agentConfig) throw new Error(`Agent: failed to load config for ${configName}`);
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
        additionalArgs,
      });
      await this.handler?.initialize();
      Logger.debug(`Agent.start(): ${this.agentConfig.nodeId} initialized.`);
      this.run();
    } catch (e) {
      Logger.error('Agent.start(): failed to start the agent', e);
      throw e;
    }
  }

  // process Message from the Engine
  async processMessage(message: Message): Promise<void> {
    Logger.debug(
      Logger.h1(`Agent:${this.agentConfig!.nodeId} received Message ${message.id} from ${message.event.source?.id}`),
    );
    Logger.logObject(message);
    return this.handler?.processMessage(message);
  }

  async shutdown(): Promise<void> {
    return this.handler?.shutdown();
  }

  // publish Events to engine
  publishEvent = async (event: Event, sourceId?: string): Promise<void> => {
    const { eventQ } = this.params;
    Logger.debug(Logger.h1(`Agent:${this.agentConfig!.nodeId} publish Event ${event.id} from ${sourceId}`));
    Logger.logObject(event);
    return eventQ.queue(event);
  };

  /*
        Begin pulling Messages from the Q to publish outbound to participants
    */
  private async run() {
    const { messageQ } = this.params;
    while (true) {
      // accept anything directed to this agents nodeId or nodeType
      const topics = [this.agentConfig!.nodeId, this.agentConfig!.nodeType];
      const qMessage: QMessage<Message> = await messageQ.pop(topics);
      try {
        await this.processMessage(qMessage.payload);
        await messageQ.delete(qMessage);
      } catch (e: any) {
        Logger.error(`Agent: failed to process message ${qMessage.payload?.id}`, e);
        const cause = serializableError(e.eventError ? e.eventError.cause : e);
        try {
          const outboundEvent = this.eventPublisher.createOutboundEvent({
            error: e.eventError ? { ...e.eventError, cause } : { ...errorCodes[errorKeys.TASK_ERROR], cause },
            prevEvent: qMessage.payload.event,
          });
          await this.eventPublisher.publishEvent(outboundEvent);
          await messageQ.reject(qMessage, e as Error).catch(Logger.error);
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
    type,
    error,
  }: {
    prevEvent: Event;
    content?: EventContent;
    type?: string;
    error?: EventError['error'];
  }) => {
    const _content = error ? { error } : content;

    return Events.newEvent({
      id: Id.getNextId(this.agentConfig!.nodeId),
      type: type || `${this.agentConfig!.nodeType}`,
      re: prevEvent.id,
      data: {
        title: `${this.agentConfig!.nodeId} Result`,
        content: _content,
      },
      source: { id: this.agentConfig!.nodeId, name: this.agentConfig!.name },
      thredId: prevEvent.thredId,
    });
  };
}
