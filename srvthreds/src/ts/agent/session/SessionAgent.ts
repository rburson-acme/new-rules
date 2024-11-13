import http from 'http';
import { Message, Event, Logger, SessionsModel } from '../../thredlib/index.js';
import { ResolverConfig } from '../../sessions/Config.js';
import { StorageFactory } from '../../storage/StorageFactory.js';
import { EventPublisher, MessageHandler, MessageHandlerParams } from '../Agent.js';
import { AgentConfig } from '../Config.js';
import { SessionService } from './SessionService.js';
import { ServiceListener, SocketService } from './SocketService.js';
import defaultSessionsModel from '../../config/sessions/sessions_model.json' with { type: 'json' };
import defaultResolverConfig from '../../config/resolver_config.json' with { type: 'json' };

// Agent specific configuration
export interface SessionAgentConfig {
  port?: number;
}

// Agent specific additional args
export interface SessionAgentArgs {
  httpServer?: http.Server;
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

  // dispatchers for sending events (from Messages) to outbound channels
  dispatchers: ((event: Event, channelId: string) => void)[] = [];

  constructor({config, eventPublisher, additionalArgs}: MessageHandlerParams) {
    this.agentConfig = config;
    this.eventPublisher = eventPublisher;

    //use supplied session model or default
    const sessionsModel = (additionalArgs as SessionAgentArgs)?.sessionsModel || defaultSessionsModel;
    const resolverConfig = (additionalArgs as SessionAgentArgs)?.resolverConfig || defaultResolverConfig;
    this.sessionService = new SessionService(sessionsModel, resolverConfig);

    // allow for use of existing http server instance
    const httpServer = (additionalArgs as SessionAgentArgs)?.httpServer || undefined;

    this.socketService = new SocketService({
      serviceListener: new SessionServiceListener(this.sessionService),
      publisher: this.eventPublisher,
      nodeId: this.agentConfig.nodeId,
      port: (this.agentConfig.customConfig as SessionAgentConfig)?.port,
      httpServer,
    });
    this.dispatchers.push(this.socketService.send);
  }

  async initialize(): Promise<void> {
    return;
  }

  async processMessage(message: Message): Promise<void> {
    const channelIds = await this.sessionService.getChannels(message);
    channelIds.forEach((channelId) => {
      this.dispatchers.forEach((dispatcher) => {
        try {
          dispatcher(message.event, channelId);
        } catch (e) {
          Logger.error(e);
          Logger.error(`Failed to send event to outbound channel ${channelId}`);
        }
      });
    });
  }

  async shutdown(): Promise<void> {
    await this.socketService.shutdown();
    return this.sessionService.shutdown();
  }
}

class SessionServiceListener implements ServiceListener {
  constructor(private sessionService: SessionService) {}

  async newSession(
    { sessionId, nodeId }: { sessionId: string; nodeId: string },
    participantId: string,
    channelId: string,
  ): Promise<void> {
    this.sessionService.addSession({ id: sessionId, nodeId }, participantId, channelId);
  }

  async sessionEnded(sessionId: string): Promise<void> {
    this.sessionService.removeSession(sessionId);
  }
}

export default SessionAgent;
