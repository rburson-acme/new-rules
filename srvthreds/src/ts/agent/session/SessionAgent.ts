import http from 'http';
import { Message, Event, Logger, SessionsModel } from '../../thredlib/index.js';
import { ResolverConfig } from '../../sessions/Config.js';
import { StorageFactory } from '../../storage/StorageFactory.js';
import { MessageHandler, MessageHandlerParams } from "../Agent.js";
import { AgentConfig } from "../Config.js";
import { SessionService } from "./SessionService.js";
import { SocketService } from "./SocketService.js";
import defaultSessionsModel from '../../config/sessions/sessions_model.json' with { type: 'json' };
import defaultResolverConfig from '../../config/resolver_config.json' with { type: 'json' };

// Agent specific configuration
export interface SessionAgentConfig {
    port?: number
}

// Agent specific additional args
export interface SessionAgentArgs {
    httpServer?: http.Server;
    sessionsModel?: SessionsModel;
    resolverConfig?: ResolverConfig;
}

export class SessionAgent implements MessageHandler {

    private agentConfig: AgentConfig;
    // publish (inbound) events to the engine
    private publisher: (event: Event, participantId: string) => Promise<void>;
    // handles websocket connections, sending and recieveing events to clients
    private socketService: SocketService;
    // handles mapping sessions to external channels (i.e. sockets or rest calls, etc.)
    private sessionService: SessionService;

    dispatchers: ((event: Event, channelId: string) => void)[] = [];

    constructor(params: MessageHandlerParams) {

        this.agentConfig = params.config;
        this.publisher = params.publisher;

        //use supplied session model or default
        const sessionsModel = (params.additionalArgs as SessionAgentArgs)?.sessionsModel || defaultSessionsModel;
        const resolverConfig = (params.additionalArgs as SessionAgentArgs)?.resolverConfig || defaultResolverConfig;
        this.sessionService = new SessionService(sessionsModel, resolverConfig);

        // allow for use of existing http server instance
        const httpServer = (params.additionalArgs as SessionAgentArgs)?.httpServer || undefined;

        this.socketService = new SocketService({
            sessionService: this.sessionService, 
            publisher: this.publisher,
            nodeId: this.agentConfig.nodeId,
            port: (this.agentConfig.customConfig as SessionAgentConfig)?.port,
            httpServer,
        });
        this.dispatchers.push(this.socketService.send);

    }

    async processMessage(message: Message): Promise<void> {

        const channelIds = await this.sessionService.getChannels(message);
        channelIds.forEach(channelId => {
            this.dispatchers.forEach(dispatcher => {
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

export default SessionAgent;