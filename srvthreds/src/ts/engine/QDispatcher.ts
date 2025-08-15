import { MessageQ } from '../queue/MessageQ.js';
import { Message, Parallel, StringMap } from '../thredlib/index.js';
import { Dispatcher } from './Dispatcher.js';
import { MessageTemplate } from './MessageTemplate.js';
import { System } from './System.js';

import { Session } from '../sessions/Session.js';
import { Logger as L } from '../thredlib/index.js';

/**
 * The QDispatcher is responsible for dispatching messages to the appropriate recipients.
 * It uses the MessageQ to send messages to agents and participants based on their addresses.
 * The tell method is used to send messages, and it handles both service addresses and participant addresses.
 * @TODO need better failure handling for all the possible async failures
 * @TODO - implement Engine notification upon failure, so that Engine can notify appropriate participants
 */

export class QDispatcher implements Dispatcher {
  public static ANY_NODE = 'ANY_NODE';

  constructor(private outboundQ: MessageQ) {}

  /*
     Note - the tell method currently waits for message queing to be complete before resolving.
     In the future, we should experiment with finishing those ops asyncronously for performance tuning.
  */
  // outbound
  tell = async (messageTemplate: MessageTemplate) => {
    const sessions = System.getSessions();
    const { to, event } = messageTemplate;
    // don't propagate failures here as this is called in the event loop
    try {
      // -------------------------------------------------------------------
      // ----- Address any messages to Agents
      const addressResolver = sessions.getAddressResolver();
      // seperate service addresses from participant addresses
      const { serviceAddresses, participantAddresses } = addressResolver.filterServiceAddresses(to);
      // -------------------------------------------------------------------
      // get a map of participantId to Sessions[] for all addressees
      const sessionsByParticipant: StringMap<Session[]> =
        await sessions.getSessionsForParticipantIds(participantAddresses);
      // warn if there are not services or participants to receive the message
      if (!Object.keys(sessionsByParticipant).length && !serviceAddresses.length) {
        L.warn(L.crit(`No participants or services found for address ${to} - dispatchers not called`));
        return;
      }

      // send messages to agents
      await Parallel.forEach(serviceAddresses, async (address, index) => {
        try {
          // get the service address from the supplied nodeId or nodeType to be used as the 'topic'
          const resolvedAddress = addressResolver.getServiceAddressForNode(address);
          const id = `${event.id}_agent_${index}`;
          const newMessage: Message = { id, event, to: [address] };
          L.debug(L.h2(`Server.tell(): Message ${id} to Agent ${address}`));
          if (resolvedAddress) await this.outboundQ.queue(newMessage, [resolvedAddress]);
        } catch (e) {
          L.error(L.crit(`Engine.tell(): Error sending message to Agent service address ${address}`), e);
        }
      });

      // send messages to participants
      // coallate participants by nodeId
      // map of nodeId to Set of participantIds
      // we'll publish 1 message to each node with the corresponding participants
      const participantsByNodeId: StringMap<Set<string>> = {};
      Object.keys(sessionsByParticipant).forEach((participantId) => {
        const sessions: Session[] = sessionsByParticipant[participantId];
        sessions.forEach((session) => {
          const nodeId = session.nodeId || QDispatcher.ANY_NODE;
          const participants: Set<string> = participantsByNodeId[nodeId] || new Set();
          participants.add(participantId);
          participantsByNodeId[nodeId] = participants;
        });
      });

      // publish messages, grouped by nodeId (topic)
      await Parallel.forEach(Object.keys(participantsByNodeId), async (nodeId, index) => {
        try {
          const id = `${event.id}_${index}`;
          const participants = participantsByNodeId[nodeId];
          const newMessage: Message = { id, event, to: [...participants] };
          // route to specific node id if present (websocket sessions require this)
          // if there's no nodeId, assume any session service can retrieve it
          const topicString = nodeId ? nodeId : 'org.wt.session';
          L.debug(L.h2(`Server.tell(): Message ${id} to ${participants} via ${topicString}`));
          await this.outboundQ.queue(newMessage, [topicString]);
        } catch (e) {
          L.error(L.crit(`Engine.tell(): Error sending message to participants with nodeId ${nodeId}`), e);
        }
      });
    } catch (e) {
      L.error(L.crit('Engine.tell(): Error'), e);
    }
  };
}
