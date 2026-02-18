import { Storage, Types } from '../../storage/Storage.js';
import { Logger, Parallel, Series, StringMap } from '../../thredlib/index.js';
import { SessionParticipant } from '../SessionParticipant.js';
import { Session } from '../Session.js';
import { Id } from '../../thredlib/core/Id.js';
const { forEach } = Parallel;

// @TODO take distributed locking into account when implementing remote version
// the set of sessionIds will need to be 'locked'
// with redis we can just attempt to update a shared set
// we'll also need to set expirations on sessions
export class SessionStorage {
  constructor(private storage: Storage) {}

  nextSessionId(): Promise<string> {
    return Promise.resolve(Id.getNextId('ses'));
  }

  async addSession(session: Session, participantId: string): Promise<void> {
    const { id: sessionId, nodeId, data } = session;
    const transaction = this.storage.newTransaction();
    this.storage.save({
      type: Types.SessionParticipant,
      item: { participantId, nodeId, data },
      id: sessionId,
      transaction,
    });
    this.storage.addToSet({ type: Types.ParticipantSessions, item: sessionId, setId: participantId, transaction });
    await transaction.execute();
  }

  async exists(sessionId: string, participantId: string): Promise<boolean> {
    //@TODO check session expiration here
    const sessionParticipant = await this.getSessionParticipant(sessionId);
    return participantId === sessionParticipant?.participantId;
  }

  async getSessionsFor(participantId: string): Promise<Session[]> {
    try {
      const sessionIds: string[] = await this.storage.retrieveSet({
        type: Types.ParticipantSessions,
        setId: participantId,
      });
      if (!sessionIds?.length) {
        Logger.warn(`No Session found for participant ${participantId}`);
        return [];
      }
      const sessions: Session[] = await Series.reduce(
        sessionIds,
        async (result, sessionId) => {
          if (sessionId) {
            const sp: SessionParticipant = await this.storage.retrieve({
              type: Types.SessionParticipant,
              id: sessionId,
            });
            if (sp) result.push({ id: sessionId, nodeId: sp.nodeId, data: sp.data });
            return result;
          }
        },
        [] as Session[],
      );
      return sessions || [];
    } catch (e) {
      Logger.error(`Failed to get Session for participant ${participantId}`, e);
      return [];
    }
  }

  async getSessionIdsFor(participantId: string): Promise<string[]> {
    try {
      return this.storage.retrieveSet({ type: Types.ParticipantSessions, setId: participantId });
    } catch (e) {
      Logger.error(`Failed to get Session for participant ${participantId}`, e);
      return [];
    }
  }

  async getSessionIdsForAll(participantIds: string[]): Promise<StringMap<string[]>> {
    const result: StringMap<string[]> = {};
    await forEach(participantIds, async (participantId) => {
      const sessionIds = await this.getSessionIdsFor(participantId);
      if (sessionIds?.length) {
        result[participantId] = sessionIds;
      }
    });
    return result;
  }

  async getSessionsForAll(participantIds: string[]): Promise<StringMap<Session[]>> {
    const result: StringMap<Session[]> = {};
    await forEach(participantIds, async (participantId) => {
      const sessions = await this.getSessionsFor(participantId);
      if (sessions?.length) {
        result[participantId] = sessions;
      }
    });
    return result;
  }

  async getSessionParticipant(sessionId: string): Promise<SessionParticipant | undefined> {
    try {
      const participant: SessionParticipant = await this.storage.retrieve({
        type: Types.SessionParticipant,
        id: sessionId,
      });
      return participant;
    } catch (e) {
      Logger.error(`Failed to get participant for ${sessionId}`, e);
      return undefined;
    }
  }

  async removeSession(sessionId: string): Promise<void> {
    const sessionParticipant = await this.getSessionParticipant(sessionId);
    if (sessionParticipant?.participantId) {
      const transaction = this.storage.newTransaction();
      this.storage.delete({ type: Types.SessionParticipant, id: sessionId, transaction });
      this.storage.removeFromSet({
        type: Types.ParticipantSessions,
        item: sessionId,
        setId: sessionParticipant.participantId,
        transaction,
      });
      await transaction.execute();
    }
  }

  async removeAllParticipants(): Promise<void> {
    const participantIds = await this.getAllParticipantIds();
    return forEach(participantIds, async (participantId: string) => {
      try {
        await this.removeParticipant(participantId);
      } catch (e) {
        Logger.error(`removeAllPartcipants:: Failed to remove participant ${participantId}`, e);
      }
    });
  }

  async removeParticipant(participantId: string): Promise<void> {
    const sessionIds = await this.getSessionIdsFor(participantId);
    if (sessionIds) {
      const transaction = this.storage.newTransaction();
      sessionIds.forEach((sessionId) =>
        this.storage.delete({ type: Types.SessionParticipant, id: sessionId, transaction }),
      );
      this.storage.deleteSet({ type: Types.ParticipantSessions, setId: participantId, transaction });
      await transaction.execute();
    }
  }

  getAllParticipantIds(): Promise<string[]> {
    return this.storage.retrieveTypeIds(Types.ParticipantSessions);
  }
}
