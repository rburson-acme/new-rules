import { SessionsModel } from '../thredlib/index.js';

/**
 * Base interface for all configuration definitions.
 */
export interface ConfigDef {}

/**
 * Configuration for the Engine service.
 * Controls event processing behavior and shutdown settings.
 */
export interface EngineConfigDef {
  /**
   * Maximum time in milliseconds to wait for in-flight events to complete during shutdown.
   * If not specified, shutdown will not wait for event processing to complete.
   */
  eventShutdownTimeout?: number;

  /**
   * Delay in milliseconds before initiating shutdown sequence.
   * Allows time for final operations before disconnecting services.
   */
  shutdownDelay?: number;

  /**
   * If true, process events sequentially (wait for each event to be completely processed before pulling the next).
   * If false or undefined (default), process events concurrently with prefetch-bounded (from rascal_config.json) concurrency.
   */
  synchronousMode?: boolean;
}

/**
 * Configuration for address resolution.
 * Maps agent addresses to their service configurations.
 */
export interface ResolverConfigDef {
  /** Array of agent service configurations for address resolution. */
  agents: ServiceConfigDef[];
}

/**
 * Configuration for an individual service/agent in the resolver.
 * Defines how to locate and communicate with a service.
 */
export interface ServiceConfigDef {
  /** Human-readable name of the service. */
  name: string;

  /** Type identifier for the service (e.g., 'org.wt.persistence'). Used for routing. */
  nodeType: string;

  /** Unique instance identifier for this service node. */
  nodeId: string;

  /** Name of the configuration for this service. Should match the configuration name loaded into persistence. */
  configName: string;

  /** If true, this service runs remotely and communicates via websockets with the session service. */
  remote?: boolean;

  /** If true, this service is hidden from participant address resolution (internal services). */
  hidden?: boolean;
}

/**
 * Configuration for Rascal (RabbitMQ wrapper).
 * Actual configuration is loaded from rascal_config.json which defines
 * exchanges, queues, bindings, publications, and subscriptions.
 */
export interface RascalConfigDef {}

/**
 * Configuration for sessions and participants.
 * SessionsModel is defined in thredlib to allow client-side session model building.
 */
export type SessionsConfigDef = SessionsModel;

/**
 * Configuration for an Agent (microservice).
 * Defines the agent's identity, implementation, messaging, and runtime behavior.
 */
export interface AgentConfigDef {
  /** Human-readable name of the agent. */
  name: string;

  /** Type identifier for the agent (e.g., 'org.wt.persistence'). Used for message routing. */
  nodeType: string;

  /**
   * Agent implementation reference.
   * Can be a string (module path) or object (inline implementation).
   */
  agentImpl: string | object;

  /**
   * Rascal subscription names from rascal_config.json.
   * Defines which message queues this agent consumes from.
   */
  subscriptionNames: string[];

  /**
   * Agent-specific configuration object.
   * Structure depends on the agent implementation (e.g., database connection settings).
   */
  customConfig?: any;

  /**
   * Event types that this agent may produce.
   * If not defined, defaults to the nodeType.
   */
  eventTypes?: [{ type: string }];

  /**
   * Delay in milliseconds before initiating agent shutdown.
   * Allows time for final operations before disconnecting.
   */
  shutdownDelay?: number;

  /**
   * Authentication token for this agent to use when making requests.
   */
  authToken?: string;

  /**
   * Comma-separated list of tokens authorized to communicate with this agent via web endpoints.
   */
  authorizedTokens?: string;

  /**
   * If true, process messages concurrently (fire-and-forget with prefetch-bounded concurrency).
   * If false or undefined (default), process messages sequentially (await each message).
   */
  asynchronousMode?: boolean;

  /**
   * Maximum time in milliseconds to wait for in-flight messages to complete during shutdown.
   * If not specified, shutdown will not wait for message processing to complete.
   */
  eventShutdownTimeout?: number;
}
