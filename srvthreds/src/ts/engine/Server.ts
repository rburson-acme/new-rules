import { Engine } from './Engine.js';
import { EventQ } from '../queue/EventQ.js';
import { MessageQ } from '../queue/MessageQ.js';
import { Sessions } from '../sessions/Sessions.js';
import { Message, Logger, StringMap, Parallel } from '../thredlib/index.js';
import { Session } from '../sessions/Session.js';
import { Config, RunConfig } from './Config.js';
import { AddressResolver } from '../sessions/AddressResolver.js';

/**
 * The Server is the main entry point for the engine.
   It starts the engine and binds the tell() method to the engine's dispatchers.
   The tell method sends outgoing Messages to the MessageQ from the Engine, addressed to Agents and Participants.
   Other internal services must subscribe to these messages and handle them.
   i.e. The 'Agent' framework pull messages from the messageQ and determines how to handle them.
 */
export class Server {
  // @TODO seperate service
  private engine: Engine;

  public static ANY_NODE = 'ANY_NODE';

  constructor(
    inboundQ: EventQ,
    private outboundQ: MessageQ,
    private sessions: Sessions,
  ) {
    this.engine = new Engine(inboundQ);
    this.engine.dispatchers.push(this.tell.bind(this));
  }

  start(config: RunConfig) {
    this.engine.start(config);
  }

  // outbound
  // @TODO need better failure handling for all the possible async failures
  // Parallel methods are failfast, but we probably shoudn't bail out if there's any single failuar
  // Consider adding that feature to Parallel
  async tell(message: Message): Promise<void> {
    // don't propagate failures here as this is called in the event loop
    try {
      const { sessions } = this;
      const { event, to } = message;
      Logger.trace(`Engine.tell(): tell: ${to} about`, event);

      // -------------------------------------------------------------------
      // ----- Address any messages to Agents
      const addressResolver = sessions.getAddressResolver();
      // seperate service addresses from participant addresses
      const { serviceAddresses, participantAddresses } = addressResolver.filterServiceAddresses(to);
      // send messages to agents
      await Parallel.forEach(serviceAddresses, async (address, index) => {
        try {
          // determine the node type for the service to be used as the topic
          const nodeType = addressResolver.getNodeTypeForServiceAddress(address);
          const id = `${event.id}_agent_${index}`;
          const newMessage: Message = { id, event, to: [address] };
          if (nodeType) await this.outboundQ.queue(newMessage, [nodeType]);
        } catch (e) {
          Logger.error(`Engine.tell(): Error sending message to Agent service address ${address}`, e);
        }
      });

      // -------------------------------------------------------------------
      // ----- Address all other messages to participants with a Session
      // get a map of participantId to Sessions[] for all addressees
      const sessionsByParticipant: StringMap<Session[]> = await sessions.getSessionsForAll(participantAddresses);
      if (!Object.keys(sessionsByParticipant).length) {
        Logger.warn(`No participants are logged in for address ${participantAddresses} - dispatchers not called`);
        return;
      }

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
          const topicString = nodeId ? `session.${nodeId}` : 'session';
          await this.outboundQ.queue(newMessage, [topicString]);
        } catch (e) {
          Logger.error(`Engine.tell(): Error sending message to participants with nodeId ${nodeId}`, e);
        }
      });
    } catch (e) {
      Logger.error('Engine.tell(): Error', e);
    }
  }
}