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
  EventManager,
} from '../thredlib/index.js';
import { AgentConfig } from './Config.js';
import { Id } from '../thredlib/core/Id.js';
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
  publishEvent: (event: Event) => Promise<void>;
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
  This framework class recieves messages (outbound from the Engine) by way of the SessionService. This is a way to run agents remotely,
  when they do not have network access to the messageQ. The message is then provided to the MessageHandler's 'processMessage' method.
  The agent config also specifies the agent's concrete implementation and starts an instance of the implementation. The processMessage
  method is called for each message pulled from the messageQ and passed to the instantiated agent (messageHandler) implementation to handle it.
  The 'publisher' provided to the agent implementation is used to send inbound Events to the Engine.
*/
export class RemoteAgentService {
  private handler?: MessageHandler;
  private agentConfig?: AgentConfig;
  readonly eventPublisher: EventPublisher;
  private eventManager: EventManager;

  constructor(
    private params: {
      agentConfig?: AgentConfig;
      additionalArgs?: {};
    },
  ) {
    this.eventPublisher = { publishEvent: this.publishEvent, createOutboundEvent: this.createOutboundEvent };
    this.eventManager = new EventManager();
  }

  async start() {
    const { additionalArgs } = this.params;
    // load config from persistence if not provided
    this.agentConfig = this.params.agentConfig;
    if (!this.agentConfig) throw new Error(`RemoteAgent: no config provided`);
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
      Logger.info(`RemoteAgent.start(): ${this.agentConfig.nodeId} initialized.`);

      await this.connect('http://localhost:3000', 'remote_agent_auth_token');
    } catch (e) {
      Logger.error('RemoteAgent.start(): failed to start the agent', { cause: e });
      throw e;
    }
  }

  async connect(url: string, token?: string) {
    try {
      await this.eventManager.connect(url, { transports: ['websocket'], jsonp: false, auth: { token } });
      this.eventManager.subscribe((event: Event) => {
        //proxy through the event and recreate the Message
        this.handleMessage({ event, id: `${event.id}-${this.agentConfig!.nodeId}`, to: [this.agentConfig!.nodeId] });
      });
    } catch (e) {
      throw new Error(`RemoteAgent: failed to connect to SessionService at : ${url}`, { cause: e });
    }
  }

  // process Message from the Engine
  async processMessage(message: Message): Promise<void> {
    Logger.debug(
      Logger.h1(
        `RemoteAgent:${this.agentConfig!.nodeId} received Message ${message.id} from ${message.event.source?.id}`,
      ),
    );
    Logger.logObject(message);
    return this.handler?.processMessage(message);
  }

  async shutdown(): Promise<void> {
    return this.handler?.shutdown();
  }

  // publish Events to engine
  publishEvent = async (event: Event): Promise<void> => {
    Logger.debug(
      Logger.h1(`RemoteAgent:${this.agentConfig!.nodeId} publish Event ${event.id} from ${event.source?.id}`),
    );
    Logger.logObject(event);
    this.eventManager.publish(event);
  };

  private async handleMessage(message: Message) {
    try {
      await this.processMessage(message);
    } catch (e: any) {
      Logger.error(`RemoteAgent: failed to process message ${message.id}`, e);
      const cause = serializableError(e.eventError ? e.eventError.cause : e);
      try {
        const outboundEvent = this.eventPublisher.createOutboundEvent({
          error: e.eventError ? { ...e.eventError, cause } : { ...errorCodes[errorKeys.TASK_ERROR], cause },
          prevEvent: message.event,
        });
        await this.eventPublisher.publishEvent(outboundEvent);
      } catch (e) {
        Logger.error(`RemoteAgent: failed to publish error event for message ${message.id}`, e);
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
