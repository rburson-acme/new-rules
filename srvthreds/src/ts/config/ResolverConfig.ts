import { ResolverConfigDef, ServiceConfigDef } from './ConfigDefs.js';
import { StringMap } from '../thredlib/index.js';
import { Config } from './Config.js';

export class ResolverConfig implements Config<ResolverConfigDef> {
  private _serviceAddressMap: StringMap<ServiceConfigDef> = {};

  constructor(resolverConfig?: ResolverConfigDef) {
    if (resolverConfig) {
      this.setServiceAddressMap(resolverConfig.agents);
    }
  }

  // call this to rebuild with updated config
  async updateConfig(resolverConfig: ResolverConfigDef) {
    this.setServiceAddressMap(resolverConfig.agents);
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

  get serviceAddressMap(): StringMap<ServiceConfigDef> {
    return this._serviceAddressMap;
  }
}
