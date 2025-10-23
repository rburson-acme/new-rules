import { Event, PatternModel, Logger, Message, SessionsModel } from '../ts/thredlib/index.js';
import { RemoteQService } from '../ts/queue/remote/RemoteQService.js';
import { EventQ } from '../ts/queue/EventQ.js';
import { Engine } from '../ts/engine/Engine.js';
import { StorageFactory } from '../ts/storage/StorageFactory.js';
import { RemoteQBroker } from '../ts/queue/remote/RemoteQBroker.js';
import { MessageQ } from '../ts/queue/MessageQ.js';
import { Sessions } from '../ts/sessions/Sessions.js';
import { Server } from '../ts/engine/Server.js';
import { SessionStorage } from '../ts/sessions/storage/SessionStorage.js';
import { AgentService } from '../ts/agent/AgentService.js';
import { RascalConfigDef, ResolverConfigDef, SessionsConfigDef } from '../ts/config/ConfigDefs.js';
import { AgentConfig } from '../ts/config/AgentConfig.js';
import { Timers } from '../ts/thredlib/index.js';
import SessionAgent from '../ts/agent/session/SessionAgent.js';
import { PersistenceFactory } from '../ts/persistence/PersistenceFactory.js';
import { System } from '../ts/engine/System.js';
import defaultSessionsModel from './config/sessions/simple_test_sessions_model.json' with { type: 'json' };
import resolverConfig from './config/simple_test_resolver_config.json' with { type: 'json' };
import { UserController } from '../ts/persistence/controllers/UserController.js';
import { ResolverConfig } from '../ts/config/ResolverConfig.js';
import { SessionsConfig } from '../ts/config/SessionsConfig.js';
import { RascalConfig } from '../ts/config/RascalConfig.js';
import { ConfigLoader } from '../ts/config/ConfigLoader.js';
import { SystemController } from '../ts/persistence/controllers/SystemController.js';
import { run as runBootstrap } from './Bootstrapper.js';
import { ConfigManager } from '../ts/config/ConfigManager.js';
const sessionAgentConfigDef = {
  name: 'Session Agent',
  nodeType: 'org.wt.session',
  nodeId: 'org.wt.session1',
  subscriptionNames: ['sub_session1_message'],
  // set the agent implementation directly (vitest has a problem with dynamic imports)
  agentImpl: SessionAgent,
  customConfig: {
    port: 3000,
    sessionsModelPath: 'src/test/config/sessions/sessions_model.json',
    resolverConfigPath: 'src/test/config/resolver_config.json',
  },
} as AgentConfig;

const sessionAgentConfig = new AgentConfig('session-agent1', sessionAgentConfigDef);

export const getEvent = (id: string, type: string, sourceId: string): Event => {
  return {
    id: id,
    type: type,
    source: {
      id: sourceId,
    },
  };
};

export const eventWith = (event: Event, params: Partial<Event>): Event => {
  return { ...event, ...params };
};

export const events: Record<string, Event> = {
  noMatch: {
    id: 'x',
    type: 'unknown.event',
    source: {
      id: 'unknown',
    },
  },
  event0: {
    id: '0',
    type: 'inbound.event0',
    source: {
      id: 'test.dataset',
    },
  },
  event1: {
    id: '1',
    re: '0',
    type: 'inbound.event1',
    source: {
      id: 'test.dataset',
    },
  },
  event1a: {
    id: '1a',
    type: 'inbound.event1a',
    source: {
      id: 'test.dataset',
    },
  },
  event2: {
    id: '2',
    type: 'inbound.event2',
    source: {
      id: 'test.dataset',
    },
  },
  event2a: {
    id: '2a',
    type: 'inbound.event2a',
    source: {
      id: 'test.dataset',
    },
  },
  event3: {
    id: '3',
    type: 'inbound.event3',
    source: {
      id: 'test.dataset',
    },
  },
  event3a: {
    id: '3a',
    type: 'inbound.event3a',
    source: {
      id: 'test.dataset',
    },
  },
  event4: {
    id: '4',
    type: 'inbound.event4',
    source: {
      id: 'test.dataset',
    },
  },
  event4a: {
    id: '4a',
    type: 'inbound.event4a',
    source: {
      id: 'test.dataset',
    },
  },
  event5: {
    id: '5',
    type: 'inbound.event5',
    source: {
      id: 'test.dataset',
    },
  },
};

export const delay = (time: number) => {
  return Timers.wait(time);
};

export const withPromise = (op: (...args: any[]) => void): Promise<void> => {
  return new Promise((resolve, reject) => {
    withPromiseHandlers(op, resolve, reject);
  });
};

export const withDispatcherPromise = (dispatchers: any[], op: (...args: any[]) => void): Promise<void> => {
  return new Promise((resolve, reject) => {
    dispatchers.length = 0;
    dispatchers.push(withPromiseHandlers(op, resolve, reject));
  });
};

export const withPromiseHandlers = (
  op: (...args: any[]) => any,
  resolve: (value?: any) => void,
  reject: (reason: any) => void,
): ((...args: any[]) => any) => {
  return async (...args: any[]) => {
    try {
      await op(...args);
      resolve();
    } catch (e) {
      reject(e);
    }
  };
};

export const withReject = (op: (...args: any[]) => any, reject: (reason?: any) => void): ((...args: any[]) => void) => {
  return async (...args: any[]) => {
    try {
      await op(...args);
    } catch (e) {
      reject(e);
    }
  };
};

export const getDispatcherPromise = (server: any): Promise<any> => {
  return new Promise((resolve) => {
    server.dispatchers = [
      (...args: any[]) => {
        resolve(args);
      },
    ];
  });
};

export const bootstrap = async () => {
  await runBootstrap('test');
};

export const createUserDbFixtures = async () => {
  await PersistenceFactory.connect();
  const uc = UserController.get();
  await Promise.all([
    uc.replaceUser({ id: 'participant0', password: 'password0' }),
    uc.replaceUser({ id: 'participant1', password: 'password1' }),
    uc.replaceUser({ id: 'participant2', password: 'password2' }),
    uc.replaceUser({ id: 'participant3', password: 'password3' }),
  ]);
};

// initializes an engine instance with the given patternModels
// if bootstrap is true, runs the bootstrap process first
export class EngineConnectionManager {
  static async newEngineInstance(patternModels: PatternModel[], bootstrap?: boolean): Promise<EngineConnectionManager> {
    bootstrap
      ? await EngineConnectionManager.loadBootstrappedConfig()
      : await EngineConnectionManager.loadDefaultConfig();
    const eventService = await RemoteQService.newInstance<Event>({
      qBroker: new RemoteQBroker(),
      subNames: ['sub_event'],
      pubName: 'pub_event',
    });
    const eventQ = new EventQ(eventService);
    const sessions = new Sessions(new SessionStorage(StorageFactory.getStorage()));
    if (!System.isInitialized()) System.initialize(sessions, { shutdown: async () => {} });
    const engine = new Engine(eventQ);
    await engine.start({ patternModels });
    const instance = new EngineConnectionManager(eventService, eventQ, engine);
    return instance;
  }

  constructor(
    readonly eventService: RemoteQService<Event>,
    readonly eventQ: EventQ,
    readonly engine: Engine,
  ) {}

  // this should be run after creating and instance with bootstrap = true
  async initBootstrapped() {
    this.eventService.deleteAll().catch(Logger.error);
  }

  async purgeAll() {
    await this.eventService.deleteAll().catch(Logger.error);
    await StorageFactory.purgeAll().catch(Logger.error);
    await PersistenceFactory.getPersistence().deleteDatabase().catch(Logger.error);
    ConfigManager.get().unloadAll();
  }

  async disconnectAll() {
    await this.eventService.disconnect().catch(Logger.error);
    await StorageFactory.disconnectAll();
  }

  async stopAllThreds() {
    await this.engine.thredsStore.terminateAllThreds();
    /*const pr = getDispatcherPromise(this.engine);
    await this.eventQ.queue(SystemEvents.getTerminateAllThredsEvent({ id: 'admin1', name: 'Admin User' }));
    await pr.catch(Logger.error); 
    */
  }

  private static async loadBootstrappedConfig() {
    await runBootstrap('test');
    await ConfigManager.get().loadConfig<RascalConfigDef, RascalConfig>({
      type: 'rascal-config',
      config: new RascalConfig(),
      configName: 'rascal_config',
    });
    await ConfigManager.get().loadConfig<ResolverConfigDef, ResolverConfig>({
      type: 'resolver-config',
      config: new ResolverConfig(),
      configName: 'resolver_config',
    });
    await ConfigManager.get().loadConfig<SessionsConfigDef, SessionsConfig>({
      type: 'sessions-model',
      config: new SessionsConfig(),
      configName: 'sessions_model',
    });
  }

  private static async loadDefaultConfig() {
    await ConfigManager.get().loadConfig<RascalConfigDef, RascalConfig>({
      type: 'rascal-config',
      config: new RascalConfig(),
      configPath: './src/test/queue/rascal_test_config.json',
    });
    await ConfigManager.get().loadConfig<ResolverConfigDef, ResolverConfig>({
      type: 'resolver-config',
      config: new ResolverConfig(),
      configPath: './src/test/config/simple_test_resolver_config.json',
    });
    await ConfigManager.get().loadConfig<SessionsConfigDef, SessionsConfig>({
      type: 'sessions-model',
      config: new SessionsConfig(),
      configPath: './src/test/config/sessions/simple_test_sessions_model.json',
    });
  }
}

// initializes an engine server instance with the given patternModels
export class ServerConnectionManager {
  static async newServerInstance(
    patternModels: PatternModel[],
    sessionsModel: SessionsModel,
    resolverConfig: ResolverConfigDef,
    additionalArgs?: {},
  ): Promise<ServerConnectionManager> {
    const rascalConfig = await ConfigManager.get().loadConfig<RascalConfigDef, RascalConfig>({
      type: 'rascal-config',
      config: new RascalConfig(),
      configPath: './src/test/queue/rascal_test_config.json',
    });
    const qBroker = new RemoteQBroker();

    // setup the q's for the engine
    const engineEventService = await RemoteQService.newInstance<Event>({ qBroker, subNames: ['sub_event'] });
    const engineEventQ = new EventQ(engineEventService);
    const engineMessageService = await RemoteQService.newInstance<Message>({ qBroker, pubName: 'pub_message' });
    const engineMessageQ = new MessageQ(engineMessageService);

    const sessions = new Sessions(
      new SessionStorage(StorageFactory.getStorage()),
      new ResolverConfig(resolverConfig),
      new SessionsConfig(sessionsModel),
    );
    if (!System.isInitialized()) System.initialize(sessions, { shutdown: async () => {} });
    // engine start engine
    const engineServer = new Server(engineEventQ, engineMessageQ);
    await engineServer.start({ patternModels });

    // setup the q's for the sessionService
    const sessionEventService = await RemoteQService.newInstance<Event>({ qBroker, pubName: 'pub_event' });
    const sessionEventQ = new EventQ(sessionEventService);
    const sessionMessageService = await RemoteQService.newInstance<Message>({
      qBroker,
      subNames: sessionAgentConfig.subscriptionNames,
    });
    const sessionMessageQ = new MessageQ(sessionMessageService);
    // standard (default) agent configuration file
    // this location is relative to the 'agent' directory
    const agent = new AgentService({
      agentConfig: sessionAgentConfig,
      eventQ: sessionEventQ,
      messageQ: sessionMessageQ,
      additionalArgs: additionalArgs,
    });
    await agent.start();

    const instance = new ServerConnectionManager(
      engineEventService,
      sessionMessageService,
      sessions,
      engineServer,
      agent,
    );
    return instance;
  }

  constructor(
    readonly engineEventQService: RemoteQService<Event>,
    readonly sessionMessageQService: RemoteQService<Message>,
    readonly sessions: Sessions,
    readonly engineServer: Server,
    readonly agent: AgentService,
  ) {}

  async purgeAll() {
    await this.engineEventQService.deleteAll().catch(Logger.error);
    await this.sessionMessageQService.deleteAll().catch(Logger.error);
    await StorageFactory.purgeAll().catch(Logger.error);
    await PersistenceFactory.getPersistence().deleteDatabase().catch(Logger.error);
    ConfigManager.get().unloadAll();
  }

  async disconnectAll() {
    // these disconnect the underlying broker,
    // so we don't have to also disconnect alll the QServices....
    // await this.engineEventService.deleteAll().catch(Logger.error);
    // await this.sessionMessageService.deleteAll().catch(Logger.error);
    await this.engineEventQService.disconnect().catch(Logger.error);
    await StorageFactory.disconnectAll();
    await this.agent.shutdown();
  }

  async stopAllThreds(id?: string) {
    await (this.engineServer as any).engine.thredsStore.terminateAllThreds();
    /*let pr = getDispatcherPromise((this.agent as any).handler);
    await this.agent
      .publishEvent(SystemEvents.getTerminateAllThredsEvent({ id, name: 'Admin User' }), id)
      .catch();
    await pr.catch();*/
  }
}

export class AgentConnectionManager {
  static async newAgentInstance(sessionAgentConfig: AgentConfig, additionalArgs?: {}): Promise<AgentConnectionManager> {
    const rascalConfig = await ConfigManager.get().loadConfig<RascalConfigDef, RascalConfig>({
      type: 'rascal-config',
      config: new RascalConfig(),
      configPath: './src/test/queue/rascal_test_config.json',
    });
    const qBroker = new RemoteQBroker();

    // these are not used for testing with this utility but currently required for the Agent
    // set up the remote Qs for the Agent
    const agentEventservice = await RemoteQService.newInstance<Event>({ qBroker, pubName: 'pub_event' });
    const agentEventQ: EventQ = new EventQ(agentEventservice);
    const agentMessageService = await RemoteQService.newInstance<Message>({
      qBroker,
      subNames: sessionAgentConfig.subscriptionNames,
    });
    const agentMessageQ: MessageQ = new MessageQ(agentMessageService);

    // create the Agent and start it
    const agent = new AgentService({
      agentConfig: sessionAgentConfig,
      eventQ: agentEventQ,
      messageQ: agentMessageQ,
      additionalArgs,
    });
    agent.start();

    return new AgentConnectionManager(agentEventservice, agentMessageService, agentEventQ, agentMessageQ, agent);
  }

  constructor(
    readonly agentEventService: RemoteQService<Event>,
    readonly agentMessageService: RemoteQService<Message>,
    readonly agentEventQ: EventQ,
    readonly agentMessageQ: MessageQ,
    readonly agent: AgentService,
  ) {}

  async purgeAll() {
    await this.agentEventService.deleteAll().catch(Logger.error);
    await this.agentMessageService.deleteAll().catch(Logger.error);
    await StorageFactory.purgeAll().catch(Logger.error);
    await PersistenceFactory.getPersistence().deleteDatabase().catch(Logger.error);
    ConfigManager.get().unloadAll();
  }

  async disconnectAll() {
    // await this.engineEventService.deleteAll().catch(Logger.error);
    // this will disconnect the underlying broker,
    await this.agentEventService.disconnect().catch(Logger.error);
    await this.agent.shutdown();
  }
}

// Allows for testing Agents WITH both Queue connections
export class AgentQueueConnectionManager {
  static async newAgentInstance(
    sessionAgentConfig: AgentConfig,
    additionalArgs?: {},
  ): Promise<AgentQueueConnectionManager> {
    const rascalConfig = await ConfigManager.get().loadConfig<RascalConfigDef, RascalConfig>({
      type: 'rascal-config',
      config: new RascalConfig(),
      configPath: './src/test/queue/rascal_test_config.json',
    });
    const qBroker = new RemoteQBroker();

    // setup the q's so we can mock (act as) the Engine
    const engineEventService = await RemoteQService.newInstance<Event>({ qBroker, subNames: ['sub_event'] });
    const engineEventQ = new EventQ(engineEventService);
    const engineMessageService = await RemoteQService.newInstance<Message>({ qBroker, pubName: 'pub_message' });
    const engineMessageQ = new MessageQ(engineMessageService);

    // set up the remote Qs for the Agent
    const agentEventService = await RemoteQService.newInstance<Event>({ qBroker, pubName: 'pub_event' });
    const agentEventQ: EventQ = new EventQ(agentEventService);
    const agentMessageService = await RemoteQService.newInstance<Message>({
      qBroker,
      subNames: sessionAgentConfig.subscriptionNames,
    });
    const agentMessageQ: MessageQ = new MessageQ(agentMessageService);

    // create the Agent and start it
    const agent = new AgentService({
      agentConfig: sessionAgentConfig,
      eventQ: agentEventQ,
      messageQ: agentMessageQ,
      additionalArgs,
    });
    await agent.start();

    return new AgentQueueConnectionManager(
      engineEventService,
      engineMessageService,
      agentEventService,
      agentMessageService,
      engineEventQ,
      engineMessageQ,
      agentEventQ,
      agentMessageQ,
      agent,
    );
  }

  constructor(
    readonly engineEventService: RemoteQService<Event>,
    readonly engineMessageService: RemoteQService<Message>,
    readonly agentEventService: RemoteQService<Event>,
    readonly agentMessageService: RemoteQService<Message>,
    readonly engineEventQ: EventQ,
    readonly engineMessageQ: MessageQ,
    readonly agentEventQ: EventQ,
    readonly agentMessageQ: MessageQ,
    readonly agent: AgentService,
  ) {}

  async purgeAll() {
    await this.engineEventService.deleteAll().catch(Logger.error);
    await this.engineMessageService.deleteAll().catch(Logger.error);
    await this.agentEventService.deleteAll().catch(Logger.error);
    await this.agentMessageService.deleteAll().catch(Logger.error);
    await StorageFactory.purgeAll().catch(Logger.error);
    await PersistenceFactory.getPersistence().deleteDatabase().catch(Logger.error);
    ConfigManager.get().unloadAll();
  }

  async disconnectAll() {
    // await this.engineEventService.deleteAll().catch(Logger.error);
    // this will disconnect the underlying broker,
    await this.engineEventService.disconnect().catch(Logger.error);
    await this.agent.shutdown();
  }
}
