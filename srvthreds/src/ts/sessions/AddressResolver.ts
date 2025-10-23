import { StringMap } from '../thredlib/index.js';
import { Address } from '../thredlib/index.js';
import { Parallel } from '../thredlib/index.js';
import { SessionStorage } from './storage/SessionStorage.js';
import { ThredContext } from '../engine/ThredContext.js';
import { ResolverConfig } from '../config/ResolverConfig.js';
import { SessionsConfig } from '../config/SessionsConfig.js';
import { ConfigManager } from '../config/ConfigManager.js';

const { forEach } = Parallel;

/*
  Groups and aliases start with a '$' and are resolved to participantIds
*/

export class AddressResolver {
  // all logged in users
  public static ALL_ALIAS: string = '$all';
  // all current users on the thred
  public static THRED_ALIAS: string = '$thred';

  private aliasMap: StringMap<(thredContext?: ThredContext) => Promise<string[]>> = {
    [AddressResolver.ALL_ALIAS]: this.getAllParticipantIds,
    [AddressResolver.THRED_ALIAS]: this.getThredParticipantIds,
  };
  private resolverConfig: ResolverConfig;
  private sessionsConfig: SessionsConfig;

  constructor(
    private storage: SessionStorage,
    resolverConfig?: ResolverConfig,
    sessionsConfig?: SessionsConfig,
  ) {
    this.resolverConfig = resolverConfig || ConfigManager.get().getConfig<ResolverConfig>('resolver-config');
    this.sessionsConfig = sessionsConfig || ConfigManager.get().getConfig<SessionsConfig>('sessions-model');
  }

  filterServiceAddresses(address: Address): {
    serviceAddresses: string[];
    remoteServiceAddresses: string[];
    participantAddresses: string[];
  } {
    const addresses = Array.isArray(address) ? address : [address];
    const serviceAddresses: string[] = [];
    const remoteServiceAddresses: string[] = [];
    let participantAddresses: Address = [];
    addresses.forEach((address) => {
      if (this.isRemoteServiceAddress(address)) {
        remoteServiceAddresses.push(address);
      } else if (this.isLocalServiceAddress(address)) {
        serviceAddresses.push(address);
      } else {
        (participantAddresses as string[]).push(address);
      }
    });

    return { serviceAddresses, remoteServiceAddresses, participantAddresses };
  }

  isLocalServiceAddress(address: string): boolean {
    return (
      this.resolverConfig.serviceAddressMap?.[address] && this.resolverConfig.serviceAddressMap[address].remote !== true
    );
  }

  isRemoteServiceAddress(address: string): boolean {
    return this.resolverConfig.serviceAddressMap?.[address]?.remote === true;
  }

  /*
   * Translate addresses (aliases, groups, and ids) to participantIds
   */
  async getParticipantIdsFor(address: Address, thredContext?: ThredContext): Promise<string[]> {
    const { aliasMap } = this;
    const addresses = Array.isArray(address) ? address : [address];
    let participantIds: string[] = [];
    //intercept $all
    if (addresses.indexOf(AddressResolver.ALL_ALIAS) > -1) {
      participantIds = await this.getAllParticipantIds();
    } else {
      const uniqueAddresses = [...new Set(addresses)];
      await forEach(uniqueAddresses, async (address) => {
        // check for aliases or groups
        if (address.startsWith('$')) {
          const aliasHandler = aliasMap[address];
          if (aliasHandler) {
            const result: string[] = await aliasHandler.bind(this)(thredContext);
            participantIds = participantIds.concat(result);
          } else {
            const ids = this.getGroupAddresses(address);
            participantIds = participantIds.concat(ids);
          }
        } else {
          participantIds.push(address);
        }
      });
    }
    const resultSet = new Set(participantIds);

    return [...resultSet];
  }

  getGroupAddresses(groupAddress: string): string[] {
    const group = groupAddress.substring(1);
    return this.sessionsConfig.groups?.[group]?.getParticipantIds() || [];
  }

  async getThredParticipantIds(context?: ThredContext): Promise<string[]> {
    if (!context) return [];
    const addresses = context.getParticipantAddresses();
    // filter out service addresses
    const { participantAddresses } = this.filterServiceAddresses(addresses);
    return participantAddresses;
  }

  getAllParticipantIds(context?: ThredContext): Promise<string[]> {
    return this.storage.getAllParticipantIds();
  }
}
