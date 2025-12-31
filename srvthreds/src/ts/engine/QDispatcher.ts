import { MessageQ } from '../queue/MessageQ.js';
import { Dispatcher } from './Dispatcher.js';
import { MessageTemplate } from './MessageTemplate.js';
import { Logger as L } from '../thredlib/index.js';
import { AddressPartitioner } from './routing/AddressPartitioner.js';
import { ParticipantGrouper } from './routing/ParticipantGrouper.js';
import { MessageRouter } from './routing/MessageRouter.js';

/**
 * The QDispatcher is responsible for dispatching messages to the appropriate recipients.
 * It uses the MessageQ to send messages to agents and participants based on their addresses.
 * The tell method is used to send messages, and it handles both service addresses and participant addresses.
 * @TODO need better failure handling for all the possible async failures
 * @TODO - implement Engine notification upon failure, so that Engine can notify appropriate participants
 */

export class QDispatcher implements Dispatcher {
  public static ANY_NODE = 'ANY_NODE';

  private partitioner: AddressPartitioner;
  private grouper: ParticipantGrouper;
  private router: MessageRouter;

  constructor(private outboundQ: MessageQ) {
    this.partitioner = new AddressPartitioner();
    this.grouper = new ParticipantGrouper();
    this.router = new MessageRouter(outboundQ);
  }

  /*
     Note - the tell method currently waits for message queing to be complete before resolving.
     In the future, we should experiment with finishing those ops asyncronously for performance tuning.
  */
  // outbound
  tell = async (messageTemplate: MessageTemplate) => {
    const { to, event } = messageTemplate;
    const thredId = event.thredId;

    // Don't propagate failures here as this is called in the event loop
    try {
      // Convert to to array if needed
      const addresses = Array.isArray(to) ? to : [to];

      // Partition addresses into service and participant addresses
      const { serviceAddresses, participantAddresses } = this.partitioner.partition(addresses);

      // Get sessions for participants
      const sessionsByParticipant = await this.grouper.getSessionsForParticipants(participantAddresses);

      // Warn if there are no services or participants to receive the message
      if (!Object.keys(sessionsByParticipant).length && !serviceAddresses.length) {
        L.warn({
          message: L.crit(`No participants or services found for address ${to} - dispatchers not called`),
          thredId,
        });
        return;
      }

      // Route to service addresses (agents)
      await this.router.routeToServices(event, serviceAddresses);

      // Group participants by nodeId and route
      const participantsByNodeId = this.grouper.groupByNodeId(sessionsByParticipant);
      await this.router.routeToParticipants(event, participantsByNodeId);
    } catch (e) {
      L.error({ message: L.crit('QDispatcher.tell(): Error'), thredId, err: e as Error });
    }
  };
}
