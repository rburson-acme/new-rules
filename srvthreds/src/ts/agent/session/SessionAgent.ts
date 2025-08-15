import { SystemController } from '../../persistence/controllers/SystemController.js';
import { Event, Logger, Message, SessionsModel, StringMap } from '../../thredlib/index.js';
import { EventPublisher, MessageHandler, MessageHandlerParams } from '../AgentService.js';
import { AgentConfig } from '../Config.js';
import { HttpService } from './ http/HttpService.js';
import { SessionService } from './SessionService.js';
import { SessionServiceListener } from './SessionServiceListener.js';
import { SocketService } from './SocketService.js';

// Agent specific configuration in custom config
export interface SessionAgentConfig {
  port?: number;
  sessionsModelName?: string;
  sessionsModelPath?: string;
  resolverConfigName?: string;
  resolverConfigPath?: string;
}

// Agent specific additional args - these override custom config
export interface SessionAgentArgs {
  port?: number;
  sessionsModelName?: string;
  sessionsModelPath?: string;
  resolverConfigName?: string;
  resolverConfigPath?: string;
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
  private socketService?: SocketService;
  // handles mapping sessions to external channels (i.e. sockets or rest calls, etc.)
  private sessionService?: SessionService;
  private httpService?: HttpService;
  private sessionAgentArgs: SessionAgentArgs;

  // dispatchers for sending events (from Messages) to outbound channels
  dispatchers: ((event: Event, channelId: string) => void)[] = [];

  constructor({ config, eventPublisher, additionalArgs }: MessageHandlerParams) {
    this.agentConfig = config;
    this.eventPublisher = eventPublisher;
    this.sessionAgentArgs = additionalArgs as SessionAgentArgs;
  }

  async initialize(): Promise<void> {
    const sessionsModelName =
      this.sessionAgentArgs?.sessionsModelName ||
      (this.agentConfig.customConfig as SessionAgentConfig)?.sessionsModelName;
    const sessionsModelPath =
      this.sessionAgentArgs?.sessionsModelPath ||
      (this.agentConfig.customConfig as SessionAgentConfig)?.sessionsModelPath;
    const resolverConfigName =
      this.sessionAgentArgs?.resolverConfigName ||
      (this.agentConfig.customConfig as SessionAgentConfig)?.resolverConfigName;
    const resolverConfigPath =
      this.sessionAgentArgs?.resolverConfigPath ||
      (this.agentConfig.customConfig as SessionAgentConfig)?.resolverConfigPath;

    if (!(sessionsModelName || sessionsModelPath))
      throw new Error(
        'SessionAgent: sessionsModelName or sessionsModelPath must be provided in config or as an argument',
      );
    if (!(resolverConfigName || resolverConfigPath))
      throw new Error(
        'SessionAgent: resolverConfigName or resolverConfigPath must be provided in config or as an argument',
      );
    const sessionsModel = await SystemController.get().getFromNameOrPath(sessionsModelName, sessionsModelPath);
    if (!sessionsModel)
      throw new Error(
        `Failed to load sessions model from sessionsModelName: ${sessionsModelName} or sessionsModelPath: ${sessionsModelPath}`,
      );
    const resolverConfig = await SystemController.get().getFromNameOrPath(resolverConfigName, resolverConfigPath);
    if (!resolverConfig)
      throw new Error(
        `Failed to load resolver config from resolverConfigName: ${resolverConfigName} or resolverConfigPath: ${resolverConfigPath}`,
      );
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
    this.httpService.start();
    Logger.info(`SessionAgent is running on port ${this.agentConfig.customConfig?.port}`);
  }

  // process Message from the Engine
  async processMessage(message: Message): Promise<void> {
    const channelIds = await this.sessionService?.getChannels(message);
    channelIds?.forEach((channelId) => {
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
    await this.socketService?.shutdown();
    await this.httpService?.shutdown();
    return this.sessionService?.shutdown();
  }
}

export default SessionAgent;
