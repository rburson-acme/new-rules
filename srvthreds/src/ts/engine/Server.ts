import { Engine } from './Engine.js';
import { EventQ } from '../queue/EventQ.js';
import { MessageQ } from '../queue/MessageQ.js';
import { Sessions } from '../sessions/Sessions.js';
import { Message, Logger, StringMap, Parallel } from '../thredlib/index.js';
import { Session } from '../sessions/Session.js';
import { RunConfig } from './Config.js';
import { ThredContext } from './ThredContext.js';
import { MessageTemplate } from './MessageTemplate.js';
import { System } from './System.js';

const { debug, error, warn, crit, h1, h2 } = Logger;

/**
 * The Server is the main entry point for the engine.
   It starts the engine and binds the tell() method to the engine's dispatchers.
   The tell method sends outgoing Messages to the MessageQ from the Engine, addressed to Agents and Participants.
   Other internal services must subscribe to these messages and handle them.
   i.e. The 'Agent' framework pull messages from the messageQ and determines how to handle them.
 */

   /*
     Note - the tell method current waits for message queing to be complete before resolving.
     In the future, we should experiment with finishing those ops asyncronously for performance tuning.
   */
export class Server {
  // @TODO seperate service
  private engine: Engine;

  public static ANY_NODE = 'ANY_NODE';

  constructor(
    inboundQ: EventQ,
    private outboundQ: MessageQ,
  ) {
    this.engine = new Engine(inboundQ);
    this.engine.dispatchers.push(this.tell.bind(this));
  }

  async start(config?: RunConfig): Promise<void> {
    return this.engine.start(config);
  }

  // outbound
  // @TODO need better failure handling for all the possible async failures
  // @TODO - implement Engine notification upon failure, so that Engine can notify appropriate participants
  async tell(messageTemplate: MessageTemplate, thredContext?: ThredContext): Promise<void> {
    const sessions = System.getSessions();
    const event = messageTemplate.event;
    // don't propagate failures here as this is called in the event loop
    try {
      // translate 'directives' in the 'to' field to actual participantIds
      const to = await sessions.getParticipantIdsFor(messageTemplate.to, thredContext);
      // update the thredContext with the expanded participants
      thredContext?.addParticipantIds(to);

      // -------------------------------------------------------------------
      // ----- Address any messages to Agents
      const addressResolver = sessions.getAddressResolver();
      // seperate service addresses from participant addresses
      const { serviceAddresses, participantAddresses } = addressResolver.filterServiceAddresses(to);
      // -------------------------------------------------------------------
      // ----- Address all other messages to participants with a Session
      // get a map of participantId to Sessions[] for all addressees
      const sessionsByParticipant: StringMap<Session[]> =
        await sessions.getSessionsForParticipantIds(participantAddresses);
      // warn if there are not services or participants to receive the message
      if (!Object.keys(sessionsByParticipant).length && !serviceAddresses.length) {
        warn(crit(`No participants or services found for address ${to} - dispatchers not called`));
        return;
      }

      // send messages to agents
      await Parallel.forEach(serviceAddresses, async (address, index) => {
        try {
          // get the service address from the supplied nodeId or nodeType to be used as the 'topic'
          const resolvedAddress = addressResolver.getServiceAddressForNode(address);
          const id = `${event.id}_agent_${index}`;
          const newMessage: Message = { id, event, to: [address] };
          debug(h2(`Server.tell(): Message ${id} to Agent ${address}`));
          if (resolvedAddress) await this.outboundQ.queue(newMessage, [resolvedAddress]);
        } catch (e) {
          error(crit(`Engine.tell(): Error sending message to Agent service address ${address}`), e);
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
          const nodeId = session.nodeId || Server.ANY_NODE;
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
          debug(h2(`Server.tell(): Message ${id} to ${participants} via ${topicString}`));
          await this.outboundQ.queue(newMessage, [topicString]);
        } catch (e) {
          error(crit(`Engine.tell(): Error sending message to participants with nodeId ${nodeId}`), e);
        }
      });
    } catch (e) {
      error(crit('Engine.tell(): Error'), e);
    }
  }
}
