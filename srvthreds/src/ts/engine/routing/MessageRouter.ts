import { MessageQ } from '../../queue/MessageQ.js';
import { Message, Event, Parallel, StringMap } from '../../thredlib/index.js';
import { Logger as L } from '../../thredlib/index.js';
import { ParticipantGrouper } from './ParticipantGrouper.js';

/**
 * Handles message routing to services and participants
 * Single responsibility: Message routing operations
 */
export class MessageRouter {
  constructor(private outboundQ: MessageQ) {}

  /**
   * Route messages to service addresses (agents)
   *
   * @param event - Event to route
   * @param serviceAddresses - Array of service addresses
   */
  async routeToServices(event: Event, serviceAddresses: string[]): Promise<void> {
    const thredId = event.thredId;

    await Parallel.forEach(serviceAddresses, async (address, index) => {
      try {
        const id = `${event.id}_agent_${index}`;
        const message: Message = { id, event, to: [address] };

        L.info({
          message: L.h2(`QDispatcher.tell(): Message ${id} to Agent ${address}`),
          thredId,
        });

        if (address) {
          await this.outboundQ.queue(message, [address]);
        }
      } catch (e) {
        L.error({
          message: L.crit(`QDispatcher.tell(): Error sending message to Agent service address ${address}`),
          thredId,
          err: e as Error,
        });
      }
    });
  }

  /**
   * Route messages to participants grouped by node ID
   *
   * @param event - Event to route
   * @param participantsByNodeId - Map of nodeId to Set of participantIds
   */
  async routeToParticipants(event: Event, participantsByNodeId: StringMap<Set<string>>): Promise<void> {
    const thredId = event.thredId;

    await Parallel.forEach(Object.keys(participantsByNodeId), async (nodeId, index) => {
      try {
        const id = `${event.id}_${index}`;
        const participants = participantsByNodeId[nodeId];
        const message: Message = { id, event, to: [...participants] };

        // Route to specific node id if present (websocket sessions require this)
        // If there's no nodeId, assume any session service can retrieve it
        const topicString = nodeId !== ParticipantGrouper.ANY_NODE ? nodeId : 'org.wt.session';

        L.info({
          message: L.h2(`QDispatcher.tell(): Message ${id} to ${[...participants]} via ${topicString}`),
          thredId,
        });

        await this.outboundQ.queue(message, [topicString]);
      } catch (e) {
        L.error({
          message: L.crit(`QDispatcher.tell(): Error sending message to participants with nodeId ${nodeId}`),
          thredId,
          err: e as Error,
        });
      }
    });
  }
}
