import { StringMap } from '../../thredlib/index.js';
import { Session } from '../../sessions/Session.js';
import { System } from '../System.js';

/**
 * Groups participants by their node ID for efficient message routing
 * Single responsibility: Participant grouping by node
 */
export class ParticipantGrouper {
  static readonly ANY_NODE = 'ANY_NODE';

  /**
   * Get sessions for participant IDs
   *
   * @param participantAddresses - Array of participant addresses
   * @returns Map of participantId to Session[]
   */
  async getSessionsForParticipants(participantAddresses: string[]): Promise<StringMap<Session[]>> {
    const sessions = System.getSessions();
    return sessions.getSessionsForParticipantIds(participantAddresses);
  }

  /**
   * Group participants by their node ID
   * Returns a map of nodeId to Set of participantIds
   * Used to publish one message per node with the corresponding participants
   *
   * @param sessionsByParticipant - Map of participantId to Session[]
   * @returns Map of nodeId to Set of participantIds
   */
  groupByNodeId(sessionsByParticipant: StringMap<Session[]>): StringMap<Set<string>> {
    const participantsByNodeId: StringMap<Set<string>> = {};

    Object.keys(sessionsByParticipant).forEach((participantId) => {
      const sessions: Session[] = sessionsByParticipant[participantId];
      sessions.forEach((session) => {
        const nodeId = session.nodeId || ParticipantGrouper.ANY_NODE;
        const participants: Set<string> = participantsByNodeId[nodeId] || new Set();
        participants.add(participantId);
        participantsByNodeId[nodeId] = participants;
      });
    });

    return participantsByNodeId;
  }
}
