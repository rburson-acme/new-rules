import { System } from '../System.js';

/**
 * Result of address partitioning
 */
export interface PartitionedAddresses {
  serviceAddresses: string[];
  remoteServiceAddresses: string[];
  participantAddresses: string[];
}

/**
 * Partitions addresses into service and participant addresses
 * Single responsibility: Address classification
 */
export class AddressPartitioner {
  /**
   * Partition addresses into service, remote service, and participant addresses
   *
   * @param addresses - Array of addresses to partition
   * @returns Partitioned addresses by type
   */
  partition(addresses: string[]): PartitionedAddresses {
    const sessions = System.getSessions();
    const addressResolver = sessions.getAddressResolver();

    const { serviceAddresses, remoteServiceAddresses, participantAddresses } =
      addressResolver.filterServiceAddresses(addresses);

    // Combine remote service addresses with participant addresses
    // Remote services are treated as participants in the routing logic
    participantAddresses.push(...remoteServiceAddresses);

    return {
      serviceAddresses,
      remoteServiceAddresses,
      participantAddresses,
    };
  }
}
