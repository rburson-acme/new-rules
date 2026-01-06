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
import { AgentConfig } from '../config/AgentConfig.js';
import { Id } from '../thredlib/core/Id.js';
import { Adapter } from './adapter/Adapter.js';
import { RemoteConnectionManager } from './remote/RemoteConnectionManager.js';
import { HttpService } from './http/HttpService.js';
import { BasicAuthentication } from '../auth/BasicAuthentication.js';
import { getHandleEventValues } from './http/EventValuesHandler.js';
import { getHandleEvent } from './http/EventHandler.js';
import { getHandleLogin, getHandleRefresh } from './http/AuthHandler.js';
import { LocalAuthStorage } from '../auth/LocalAuthStorage.js';

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
    prevEvent?: Partial<Event>;
    content?: any;
    type?: string;
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
  private static LOCAL_HTTP_PORT = 3000;
  private handler?: MessageHandler;
  private agentConfig?: AgentConfig;
  readonly eventPublisher: EventPublisher;
  private connectionManager: RemoteConnectionManager;
  private httpService?: HttpService;

  constructor(
    private params: {
      agentConfig?: AgentConfig;
      additionalArgs?: {};
    },
  ) {
    this.eventPublisher = { publishEvent: this.publishEvent, createOutboundEvent: this.createOutboundEvent };
    this.connectionManager = new RemoteConnectionManager();
  }

  async start() {
    const { additionalArgs } = this.params;
    // note: the config proxy could be used throughout if we need to dynamically reload config
    this.agentConfig = this.params.agentConfig;
    if (!this.agentConfig) throw new Error(`RemoteAgent: no config provided`);
    // Get the authToken from the config to connect to the SessionService
    const authToken = this.agentConfig.authToken;
    if (!authToken) throw new Error(`RemoteAgent: no auth found in config`);
    // Get the authorizedTokens from the config to validate incoming requests
    const authorizedTokens = this.agentConfig.authorizedTokens ? this.agentConfig.authorizedTokens.split(',') : [];

    BasicAuthentication.initialize(new LocalAuthStorage(authorizedTokens));
    // start local http service for login, event posting, etc.
    this.startHttpService();
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

      //await this.connect('http://localhost:3000', authToken);
      await this.connect('http://localhost:3000', 'org.wt.robot');
    } catch (e) {
      Logger.error('RemoteAgent.start(): failed to start the agent', { cause: e });
      throw e;
    }
  }

  async startHttpService() {
    this.httpService = new HttpService({
      publisher: this.eventPublisher,
      auth: BasicAuthentication.getInstance(),
      agentConfig: this.agentConfig!,
      port: (this.agentConfig!.customConfig as StringMap<any>)?.port || RemoteAgentService.LOCAL_HTTP_PORT,
      routes: [
        {
          handler: getHandleLogin,
          method: 'post',
          path: '/login',
        },
        {
          handler: getHandleRefresh,
          method: 'post',
          path: '/refresh',
        },
        {
          handler: getHandleEvent,
          method: 'post',
          path: '/event',
        },
        {
          handler: getHandleEventValues,
          method: 'post',
          path: '/values/:thredId?/:re?',
        },
      ],
    });
  }

  async connect(url: string, token?: string) {
    try {
      // remote agents should request message proxying so that the message can be further routed if necessary
      await this.connectionManager.connect(url, {
        transports: ['websocket'],
        jsonp: false,
        auth: { token },
        extraHeaders: { 'x-proxy-message': true },
      });
      this.connectionManager.subscribe((message: Message) => {
        //proxy the Message through
        this.handleMessage(message);
      });
    } catch (e) {
      throw new Error(`RemoteAgent: failed to connect to SessionService at : ${url}`, { cause: e });
    }
  }

  // process Message from the Engine
  async processMessage(message: Message): Promise<void> {
    Logger.info({
      message: Logger.h1(
        `RemoteAgent:${this.agentConfig!.nodeId} received Message ${message.id} from ${message.event.source?.id}`,
      ),
      thredId: message.event.thredId,
    });
    Logger.debug({ thredId: message.event.thredId, obj: message });
    return this.handler?.processMessage(message);
  }

  async shutdown(): Promise<void> {
    return this.handler?.shutdown();
  }

  // publish Events to engine
  publishEvent = async (event: Event): Promise<void> => {
    Logger.info({
      message: Logger.h1(`RemoteAgent:${this.agentConfig!.nodeId} publish Event ${event.id} from ${event.source?.id}`),
      thredId: event.thredId,
    });
    Logger.debug({ thredId: event.thredId, obj: event });
    this.connectionManager.publish(event);
  };

  private async handleMessage(message: Message) {
    try {
      await this.processMessage(message);
    } catch (e: any) {
      const thredId = message.event.thredId;
      Logger.error({
        message: `RemoteAgent: failed to process message ${message.id} for thredId: ${thredId}`,
        err: e,
        thredId,
      });
      const cause = serializableError(e.eventError ? e.eventError.cause : e);
      try {
        const outboundEvent = this.eventPublisher.createOutboundEvent({
          error: e.eventError ? { ...e.eventError, cause } : { ...errorCodes[errorKeys.TASK_ERROR], cause },
          prevEvent: message.event,
        });
        await this.eventPublisher.publishEvent(outboundEvent);
      } catch (e) {
        Logger.error({
          message: `RemoteAgent: failed to publish error event for message ${message.id} for thredId: ${thredId}`,
          err: e as Error,
          thredId,
        });
      }
    }
  }

  private createOutboundEvent = <T>({
    prevEvent,
    content,
    type,
    error,
  }: {
    prevEvent?: Partial<Event>;
    content?: EventContent;
    type?: string;
    error?: EventError['error'];
  }) => {
    const _content = error ? { error } : content;

    return Events.newEvent({
      id: Id.getNextId(this.agentConfig!.nodeId),
      type: type || `${this.agentConfig!.nodeType}`,
      re: prevEvent?.id,
      data: {
        title: `${this.agentConfig!.nodeId} Result`,
        content: _content,
      },
      source: { id: this.agentConfig!.nodeId, name: this.agentConfig!.name },
      thredId: prevEvent?.thredId,
    });
  };
}
