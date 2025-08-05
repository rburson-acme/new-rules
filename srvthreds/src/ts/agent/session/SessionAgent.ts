import defaultResolverConfig from '../../config/resolver_config.json' with { type: 'json' };
import defaultSessionsModel from '../../config/sessions/sessions_model.json' with { type: 'json' };
import { ResolverConfig } from '../../sessions/Config.js';
import { Event, Logger, Message, SessionsModel } from '../../thredlib/index.js';
import { EventPublisher, MessageHandler, MessageHandlerParams } from '../Agent.js';
import { AgentConfig } from '../Config.js';
import { HttpService } from './ http/HttpService.js';
import { SessionService } from './SessionService.js';
import { SessionServiceListener } from './SessionServiceListener.js';
import { SocketService } from './SocketService.js';

// Agent specific configuration
export interface SessionAgentConfig {
  port?: number;
}

// Agent specific additional args
export interface SessionAgentArgs {
  sessionsModel?: SessionsModel;
  resolverConfig?: ResolverConfig;
}

/**
 * This is an agent that handles routing outbound Messages to participants, based on sessions.
 * It also handles routing inbound Events to the engine, via the provided eventPublisher.
 */
export class SessionAgent implements MessageHandler {
  private agentConfig: AgentConfig;
  // publish (inbound) events to the engine
  private eventPublisher: EventPublisher;
  // handles websocket connections, sending and recieveing events to clients
  private socketService: SocketService;
  // handles mapping sessions to external channels (i.e. sockets or rest calls, etc.)
  private sessionService: SessionService;
  private httpService: HttpService;

  // dispatchers for sending events (from Messages) to outbound channels
  dispatchers: ((event: Event, channelId: string) => void)[] = [];

  constructor({ config, eventPublisher, additionalArgs }: MessageHandlerParams) {
    this.agentConfig = config;
    this.eventPublisher = eventPublisher;
    //use supplied session model or default
    const sessionsModel = (additionalArgs as SessionAgentArgs)?.sessionsModel || defaultSessionsModel;
    const resolverConfig = (additionalArgs as SessionAgentArgs)?.resolverConfig || defaultResolverConfig;
    this.sessionService = new SessionService(sessionsModel, resolverConfig);
    const serviceListener = new SessionServiceListener(this.sessionService);

    this.httpService = new HttpService({
      serviceListener,
      publisher: this.eventPublisher,
      nodeId: this.agentConfig.nodeId,
      port: (this.agentConfig.customConfig as SessionAgentConfig)?.port,
    });

    this.socketService = new SocketService({
      serviceListener,
      publisher: this.eventPublisher,
      nodeId: this.agentConfig.nodeId,
      httpServer: this.httpService.httpServer,
    });
    this.dispatchers.push(this.socketService.send);
  }

  async initialize(): Promise<void> {
    this.httpService.start();
    Logger.info(`SessionAgent is running on port ${this.agentConfig.customConfig?.port}`);
  }

  // process Message from the Engine
  async processMessage(message: Message): Promise<void> {
    const channelIds = await this.sessionService.getChannels(message);
    channelIds.forEach((channelId) => {
      this.dispatchers.forEach((dispatcher) => {
        try {
          dispatcher(message.event, channelId);
        } catch (e) {
          Logger.error(e);
          Logger.error(`session: Failed to send event to outbound channel ${channelId}`);
        }
      });
    });
  }

  async shutdown(): Promise<void> {
    await this.socketService.shutdown();
    await this.httpService.shutdown();
    return this.sessionService.shutdown();
  }
}

export default SessionAgent;
