import http from 'http';
import {
  Message,
  Event,
  Logger,
  SessionsModel,
  eventTypes,
  errorCodes,
  errorKeys,
  PatternModel,
  EventValues,
} from '../../thredlib/index.js';
import { ResolverConfig } from '../../sessions/Config.js';
import { StorageFactory } from '../../storage/StorageFactory.js';
import { EventPublisher, MessageHandler, MessageHandlerParams } from '../Agent.js';
import { AgentConfig } from '../Config.js';
import { SessionService } from '../session/SessionService.js';
import { SocketService } from '../session/SocketService.js';
import defaultSessionsModel from '../../config/sessions/sessions_model.json' with { type: 'json' };
import defaultResolverConfig from '../../config/resolver_config.json' with { type: 'json' };
import { SessionServiceListener } from '../session/SessionServiceListener.js';
import { AdminAdapter } from './AdminAdapter.js';
import { PersistenceAdapter } from '../persistence/PersistenceAdapter.js';
import { PersistenceFactory } from '../../persistence/PersistenceFactory.js';
import { ThredsStore } from '../../engine/store/ThredsStore.js';
import { EventStore } from '../../engine/store/EventStore.js';
import { PatternsStore } from '../../engine/store/PatternsStore.js';
import { EventThrowable } from '../../thredlib/core/Errors.js';
import { Id } from '../../thredlib/core/Id.js';
import { RunConfig } from '../../engine/Config.js';
import { Pattern } from '../../engine/Pattern.js';
import { Threds } from '../../engine/Threds.js';

// Agent specific configuration
export interface AdminAgentConfig {
  port?: number;
}

// Agent specific additional args
export interface AdminAgentArgs {
  httpServer?: http.Server;
  sessionsModel?: SessionsModel;
  resolverConfig?: ResolverConfig;
  runConfig: RunConfig;
}

/**
 * The AdminAgent is a non-standard Agent - it makes use of some of the features of the Agent framework, but communicates directly with the participant
 * Note the standard handlers for Events to and Messages from the Engine (eventPublisher and processMessage) are not implemented (yet)
 * Instead the Agent uses intermiaite handlers to process inbound Events and sends them back directly to participant
 * It may be useful to implement the standard handlers in the future, in order to communicate with the Engine
 */
export class AdminAgent implements MessageHandler {
  private agentConfig: AgentConfig;
  // publish (inbound) events to the engine
  private eventPublisher: EventPublisher;
  // handles websocket connections, sending and recieveing events to clients
  private socketService: SocketService;
  // handles mapping sessions to external channels (i.e. sockets or rest calls, etc.)
  private sessionService: SessionService;

  private adminAdapter?: AdminAdapter;
  private persistenceAdapter: PersistenceAdapter;

  // dispatchers for sending events (from Messages) to outbound channels
  dispatchers: ((event: Event, channelId: string) => void)[] = [];

  constructor({ config, eventPublisher, additionalArgs }: MessageHandlerParams) {
    this.agentConfig = config;
    // hold on to the eventPublisher for sending events to the engine (not currently used but possiibly in the future)
    this.eventPublisher = eventPublisher;
    // runtime configuration (i.e. patterns, etc.)
    const runConfig = (additionalArgs as AdminAgentArgs)?.runConfig || undefined;
    const storage = StorageFactory.getStorage();
    const { patternModels } = runConfig;
    const patterns = patternModels.map((patternModel: PatternModel) => new Pattern(patternModel));
    const patternsStore = new PatternsStore(storage);
    patternsStore.addPatterns(patterns);

    // set up adapters
    //this.adminAdapter = new AdminAdapter(
     // new Threds(new ThredsStore(new EventStore(), patternsStore, storage), this.eventPublisher),
    //);
    this.persistenceAdapter = new PersistenceAdapter(PersistenceFactory.getPersistence());

    //use supplied session model or default
    const sessionsModel = (additionalArgs as AdminAgentArgs)?.sessionsModel || defaultSessionsModel;
    const resolverConfig = (additionalArgs as AdminAgentArgs)?.resolverConfig || defaultResolverConfig;
    this.sessionService = new SessionService(sessionsModel, resolverConfig);

    // allow for use of existing http server instance
    const httpServer = (additionalArgs as AdminAgentArgs)?.httpServer || undefined;

    // Note: we are not using the standard eventPublisher as we need to intercept inbound events
    // local publisher for processing inbound events
    const localPublisher: EventPublisher = {
      publishEvent: this.processInboundEvent,
      createOutboundEvent: this.eventPublisher.createOutboundEvent,
    };

    this.socketService = new SocketService({
      serviceListener: new SessionServiceListener(this.sessionService),
      publisher: this.eventPublisher,
      nodeId: this.agentConfig.nodeId,
      port: (this.agentConfig.customConfig as AdminAgentConfig)?.port,
      httpServer,
    });
    this.dispatchers.push(this.socketService.send);
  }

  async initialize(): Promise<void> {
    return this.adminAdapter?.initialize();
  }

  // Inbound events
  processInboundEvent = async (event: Event): Promise<void> => {
    const _event = { ...event, thredId: Id.getNextId(this.agentConfig.nodeId) };
    let result: EventValues['values'] | undefined;
    try {
      if (_event.type === eventTypes.control.dataControl.type) {
        result = await this.persistenceAdapter.execute(_event);
      } else if (_event.type === eventTypes.control.sysControl.type) {
        result = await this.adminAdapter?.execute(_event);
      }
      const outboundEvent = this.eventPublisher.createOutboundEvent({ prevEvent: _event, content: { values: result } });
      const message: Message = { event: outboundEvent, id: outboundEvent.id, to: [_event.source.id] };
      await this.dispatchMessage(message);
    } catch (e) {
      const eventError =
        e instanceof EventThrowable ? e.eventError : { ...errorCodes[errorKeys.SERVER_ERROR], cause: e };
      Logger.error(`AdminAgent: failed to process event ${_event.id}::${_event.thredId}`, eventError, e);
      this.eventPublisher.createOutboundEvent({
        prevEvent: _event,
        error: eventError,
      });
    }
  };

  async dispatchMessage(message: Message): Promise<void> {
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

  // process Message from the Engine
  async processMessage(message: Message): Promise<void> {
    // not currently implemented
  }

  async shutdown(): Promise<void> {
    await this.socketService.shutdown();
    return this.sessionService.shutdown();
  }
}

export default AdminAgent;
