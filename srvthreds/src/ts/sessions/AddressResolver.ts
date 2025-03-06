import { StringMap } from '../thredlib/index.js';
import { GroupModel } from '../thredlib/index.js';
import { Address } from '../thredlib/index.js';
import { Parallel } from '../thredlib/index.js';
import { Group } from './Group.js';
import { ResolverConfig } from './Config.js';
import { SessionStorage } from './storage/SessionStorage.js';

const { forEach } = Parallel;

/*
  Groups and aliases start with a '$' and are resolved to participantIds
*/

export class AddressResolver {
  public static ALL_ALIAS: string = '$all';

  private groups: StringMap<Group> | undefined;
  private serviceAddressMap: StringMap<string> | undefined;

  private aliasMap: StringMap<() => Promise<string[]>> = {
    [AddressResolver.ALL_ALIAS]: this.getAllParticipantIds,
  };

  constructor(
    groupModels: GroupModel[],
    resolverConfig: ResolverConfig,
    private storage: SessionStorage,
  ) {
    this.setGroupModels(groupModels);
    this.setServiceAddressMap(resolverConfig.agents);
  }

  setGroupModels(groupModels: GroupModel[]) {
    this.groups = groupModels.reduce((accum: StringMap<Group>, group) => {
      accum[group.name] = new Group(group);
      return accum;
    }, {});
  }

  setServiceAddressMap(agents: ResolverConfig['agents']) {
    this.serviceAddressMap = agents.reduce((accum, next) => {
      accum[next.address] = next.nodeType;
      return accum;
    }, {} as StringMap<string>);
  }

  filterServiceAddresses(address: Address | string[]): {
    serviceAddresses: string[];
    participantAddresses: string[] | Address;
  } {
    const addresses = Array.isArray(address) ? address : address.include;
    const serviceAddresses: string[] = [];
    let participantAddresses: string[] | Address = [];
    addresses.forEach((address) => {
      if (this.isServiceAddress(address)) {
        serviceAddresses.push(address);
      } else {
        (participantAddresses as string[]).push(address);
      }
    });
    if (!Array.isArray(address)) {
      //if it was an 'Address' object, put it back...
      participantAddresses = { include: participantAddresses, exclude: address.exclude };
    }

    return { serviceAddresses, participantAddresses };
  }

  isServiceAddress(address: string): boolean {
    return address.startsWith('org.wt.');
  }

  getNodeTypeForServiceAddress(address: string): string | undefined {
    return this.serviceAddressMap?.[address];
  }

  /*
   * Translate addresses (aliases, groups, and ids) to participantIds
   */
  async getParticipantIdsFor(address: Address | string[]): Promise<string[]> {
    const { groups, aliasMap } = this;

    let addresses = Array.isArray(address) ? address : address.include;

    // @TODO @TEMP @DEMO add admin for demo ---
    //addresses.push('admin');
    // ---------------------------------------

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
            const result: string[] = await aliasHandler();
            participantIds = participantIds.concat(result);
          } else {
            const group = address.substring(1);
            const ids = groups?.[group]?.getParticipantIds() || [];
            participantIds = participantIds.concat(ids);
          }
        } else {
          participantIds.push(address);
        }
      });
    }
    const resultSet = new Set(participantIds);
    (address as Address)?.exclude?.forEach((xAddress) => resultSet.delete(xAddress));

    return [...resultSet];
  }

  getAllParticipantIds(): Promise<string[]> {
    return this.storage.getAllParticipantIds();
  }
}
