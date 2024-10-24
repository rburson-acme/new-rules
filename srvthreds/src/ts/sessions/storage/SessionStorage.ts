import { Storage, Types, indexId } from '../../storage/Storage.js';
import { Id } from '../Id.js';
import { Logger, Parallel, Series, StringMap } from '../../thredlib/index.js';
import { SessionParticipant } from '../SessionParticipant.js';
import { Session } from '../Session.js';
const { forEach } = Parallel;

// @TODO take distributed locking into account when implementing remote version
// the set of sessionIds will need to be 'locked'
// with redis we can just attempt to update a shared set
// we'll also need to set expirations on sessions
export class SessionStorage {
  constructor(private storage: Storage) {}

  nextSessionId(): Promise<string> {
    return Promise.resolve(Id.nextSessionId);
  }

  async addSession(session: Session, participantId: string): Promise<void> {
    const { id: sessionId, nodeId } = session;
    await this.storage.save(Types.SessionParticipant, { participantId, nodeId }, sessionId);
    await this.storage.addToSet(Types.ParticipantSessions, sessionId, participantId);
  }

  async exists(sessionId: string, participantId: string): Promise<boolean> {
    //@TODO check session expiration here
    const sessionParticipant = await this.getSessionParticipant(sessionId);
    return participantId === sessionParticipant?.participantId;
  }

  async getSessionsFor(participantId: string): Promise<Session[]> {
    try {
      const sessionsIds: string[] = await this.storage.retrieveSet(Types.ParticipantSessions, participantId);
      if (!sessionsIds?.length) {
        Logger.error(`No Session found for participant ${participantId}`);
        return [];
      }
      const sessions: Session[] = await this.storage.retrieveAll(Types.SessionParticipant, sessionsIds);
      return sessions || [];
    } catch (e) {
      Logger.error(`Failed to get Session for participant ${participantId}`, e);
      return [];
    }
  }

  async getSessionIdsFor(participantId: string): Promise<string[]> {
    try {
      return this.storage.retrieveSet(Types.ParticipantSessions, participantId);
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
      const participant: SessionParticipant = await this.storage.retrieve(Types.SessionParticipant, sessionId);
      return participant;
    } catch (e) {
      Logger.error(`Failed to get participant for ${sessionId}`, e);
      return undefined;
    }
  }

  async removeSession(sessionId: string): Promise<void> {
    const sessionParticipant = await this.getSessionParticipant(sessionId);
    if (sessionParticipant?.participantId) {
      await this.storage.delete(Types.SessionParticipant, sessionId);
      return this.storage.removeFromSet(Types.ParticipantSessions, sessionId, sessionParticipant.participantId);
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
      if (sessionIds.length) {
        await forEach(sessionIds, async (sessionId) => this.storage.delete(Types.SessionParticipant, sessionId));
      }
      await this.storage.deleteSet(Types.ParticipantSessions, participantId);
    }
  }

  getAllParticipantIds(): Promise<string[]> {
    return this.storage.retrieveSet(Types.ParticipantSessions, indexId);
  }
}
