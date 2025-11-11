import { BasicAuth } from '../../auth/BasicAuth.js';
import { Event, Logger, Message } from '../../thredlib/index.js';
import { EventPublisher, MessageHandler, MessageHandlerParams } from '../AgentService.js';
import { AgentConfig } from '../../config/AgentConfig.js';
import { getHandleLogin, getHandleRefresh } from '../http/AuthHandler.js';
import { getHandleEvent } from '../http/EventHandler.js';
import { HttpService } from '../http/HttpService.js';
import { SessionService } from './SessionService.js';
import { SessionServiceListener } from './SessionServiceListener.js';
import { SocketService } from './SocketService.js';
import { getHandleEventValues } from '../http/EventValuesHandler.js';
import { AuthStorage } from '../../auth/AuthStorage.js';
import { StorageFactory } from '../../storage/StorageFactory.js';
import { ConfigManager } from '../../config/ConfigManager.js';
import { ResolverConfigDef, SessionsConfigDef } from '../../config/ConfigDefs.js';
import { SessionsConfig } from '../../config/SessionsConfig.js';
import { ResolverConfig } from '../../config/ResolverConfig.js';

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
  dispatchers: ((messageOrEvent: Message | Event, channelId: string) => void)[] = [];

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

    const sessionsConfig = await ConfigManager.get().loadConfig<SessionsConfigDef, SessionsConfig>({
      type: 'sessions-model',
      config: new SessionsConfig(),
      configName: sessionsModelName,
      configPath: sessionsModelPath,
    });
    if (!sessionsConfig)
      throw new Error(
        `Failed to load sessions model from configName: ${sessionsModelName} or configPath: ${sessionsModelPath}`,
      );

    const resolverConfig = await ConfigManager.get().loadConfig<ResolverConfigDef, ResolverConfig>({
      type: 'resolver-config',
      config: new ResolverConfig(),
      configName: resolverConfigName,
      configPath: resolverConfigPath,
    });
    if (!resolverConfig)
      throw new Error(
        `Failed to load resolver config from configName: ${resolverConfigName} or configPath: ${resolverConfigPath}`,
      );

    BasicAuth.initialize(new AuthStorage(StorageFactory.getStorage()));
    this.sessionService = new SessionService();
    const serviceListener = new SessionServiceListener(this.sessionService);

    this.httpService = new HttpService({
      publisher: this.eventPublisher,
      auth: BasicAuth.getInstance(),
      agentConfig: this.agentConfig,
      port: (this.agentConfig.customConfig as SessionAgentConfig)?.port,
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

    this.socketService = new SocketService({
      serviceListener,
      publisher: this.eventPublisher,
      nodeId: this.agentConfig.nodeId,
      httpServer: this.httpService.httpServer,
      auth: BasicAuth.getInstance(),
    });
    this.dispatchers.push(this.socketService.send);
    this.httpService.start();
    Logger.info(`SessionAgent is running on port ${this.agentConfig.customConfig?.port}`);
  }

  // process Message from the Engine
  async processMessage(message: Message): Promise<void> {
    const channels = await this.sessionService?.getChannels(message);
    channels?.forEach((channel) => {
      this.dispatchers.forEach((dispatcher) => {
        try {
          // if the channel is a proxy, send the full message so that it can be further routed, otherwise just the event
          channel.isProxy ? dispatcher(message, channel.id) : dispatcher(message.event, channel.id);
        } catch (e) {
          const addresses = message.to.join(',');
          if (channel.isProxy) {
            Logger.error({
              msg: `SessionAgent: Failed to send message to proxy channel ${channel.id} for addresses: ${addresses}`,
              err: e as Error,
              thredId: message.event.thredId,
            });
          } else {
            Logger.error({
              msg: `SessionAgent: Failed to send event to outbound channel ${channel.id} for addresses: ${addresses}`,
              err: e as Error,
              thredId: message.event.thredId,
            });
          }
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
