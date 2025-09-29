export interface ResolverConfig {
  agents: ServiceConfig[];
}

export interface ServiceConfig {
  name: string;
  nodeType: string;
  nodeId: string;
  configName: string;
  remote?: boolean;
}

export class Config {
  static resolverConfig: ResolverConfig;
}
