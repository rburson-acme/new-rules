import { ResolverConfigDef, ServiceConfigDef } from './ConfigDefs.js';
import { StringMap } from '../thredlib/index.js';
import { Config } from './Config.js';

export class ResolverConfig implements Config<ResolverConfigDef> {
  private _serviceAddressMap: StringMap<ServiceConfigDef> = {};
  private _configNameMap: StringMap<ServiceConfigDef> = {};
  private _services: ServiceConfigDef[] = [];

  constructor(resolverConfig?: ResolverConfigDef) {
    if (resolverConfig) {
      this._services = resolverConfig.agents || [];
      this.setServiceAddressMap(resolverConfig.agents);
      this.setConfigNameMap(resolverConfig.agents);
    }
  }

  // call this to rebuild with updated config
  async updateConfig(resolverConfig: ResolverConfigDef) {
    this._services = resolverConfig.agents || [];
    this.setServiceAddressMap(resolverConfig.agents);
    this.setConfigNameMap(resolverConfig.agents);
  }

  // map both nodeId and nodeType to the service address
  // so the it can be looked up by either
  setServiceAddressMap(agents: ServiceConfigDef[]) {
    this._serviceAddressMap = agents.reduce((accum, next) => {
      accum[next.nodeType] = next;
      accum[next.nodeId] = next;
      return accum;
    }, {} as StringMap<ServiceConfigDef>);
  }

  // unique by configName
  setConfigNameMap(agents: ServiceConfigDef[]) {
    this._configNameMap = agents.reduce((accum, next) => {
      if (next.configName) {
        accum[next.configName] = next;
      }
      return accum;
    }, {} as StringMap<ServiceConfigDef>);
  }

  get configNames(): string[] {
    return Object.keys(this._configNameMap);
  }

  getServiceConfigDefForName(configName: string): ServiceConfigDef | undefined {
    return this._configNameMap[configName];
  }

  get serviceAddressMap(): StringMap<ServiceConfigDef> {
    return this._serviceAddressMap;
  }

  get configNameServiceMap(): StringMap<ServiceConfigDef> {
    return this._configNameMap;
  }

  get services(): ServiceConfigDef[] {
    return this._services;
  }
}
