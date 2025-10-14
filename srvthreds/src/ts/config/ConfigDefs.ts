import { SessionsModel } from '../thredlib/index.js';

export interface ConfigDef {}

export interface EngineConfigDef {}
export interface ResolverConfigDef {
  agents: ServiceConfigDef[];
}

export interface ServiceConfigDef {
  name: string;
  nodeType: string;
  nodeId: string;
  configName: string;
  remote?: boolean;
}

export interface RascalConfigDef {}

// SessionsModel is part of thredlib so that the client can use it build session models
export type SessionsConfigDef = SessionsModel;

export interface AgentConfigDef {
  name: string;
  nodeType: string;
  agentImpl: string | object;
  // the rascal Message topic to use from the rascal.config
  subscriptionNames: string[];
  // specific agent configuration can go here
  customConfig?: any;
  // types of events that this service may produce
  // if not defined the event type defaults to the nodeType
  eventTypes?: [{ type: string }];
}
