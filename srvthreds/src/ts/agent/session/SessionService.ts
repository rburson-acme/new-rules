import { Logger, Message, SessionsModel, StringMap } from '../../thredlib/index.js';
import { Session } from '../../sessions/Session.js';
import { Sessions } from '../../sessions/Sessions.js';
import { SessionStorage } from '../../sessions/storage/SessionStorage.js';
import { StorageFactory } from '../../storage/StorageFactory.js';
import { ResolverConfig } from '../../config/ResolverConfig.js';
import { SessionsConfig } from '../../config/SessionsConfig.js';

export interface Channel {
  id: string;
  isProxy: boolean;
}

export class SessionService {
  private sessions: Sessions;
  private sessionChannels: StringMap<Channel> = {};

  constructor() {
    this.sessions = new Sessions(new SessionStorage(StorageFactory.getStorage()));
  }

  async addSession(session: Session, participantId: string, channelId: string): Promise<void> {
    const { id: sessionId } = session;
    const { sessions, sessionChannels } = this;
    // if this session already exists, just map it to the new channel
    // this likely means the client has disconnected and reconnected
    if (!(await sessions.exists(sessionId, participantId))) {
      await sessions.addSession(session, participantId);
    }
    sessionChannels[sessionId] = { id: channelId, isProxy: session.data?.isProxy || false };
  }

  async removeSession(sessionId: string): Promise<void> {
    await this.sessions.removeSession(sessionId);
    delete this.sessionChannels[sessionId];
  }

  async removeParticipant(participantId: string): Promise<void> {
    const sessionIds: string[] = await this.sessions.getSessionIdsFor(participantId);
    sessionIds.forEach((sessionId) => delete this.sessionChannels[sessionId]);
    return this.sessions.removeParticipant(participantId);
  }

  // map recipients to channels
  async getChannels(message: Message): Promise<Channel[]> {
    const { sessions, sessionChannels } = this;
    const { event, to } = message;
    //Logger.debug(`SessionService: getChannels for: ${to}`, event);

    const sessionsByParticipant: StringMap<string[]> = await sessions.getSessionIdsForParticipantIds(to);
    if (!Object.keys(sessionsByParticipant).length) {
      Logger.warn(`SessionService: No participants are logged in for address ${to}`);
      return [];
    }
    const channels: Channel[] = [];
    Object.keys(sessionsByParticipant).forEach((participantId) => {
      const sessionIds = sessionsByParticipant[participantId];
      if (sessionIds.length) {
        sessionIds.forEach((sessionId) => {
          const channel = sessionChannels[sessionId];
          if (channel) {
            channels.push(channel);
          } else {
            // If the sessionId is no longer mapped to a channel, then the session must be an orphan
            this.removeSession(sessionId).catch((e) => `Failed to remove orphaned Session: ${sessionId}`);
            Logger.error(`SessionService: no channel found for session ${sessionId} participant ${participantId}`);
          }
        });
      } else {
        Logger.error(`SessionService: participant ${to} not found`);
      }
    });
    return channels;
  }

  async shutdown() {
    await StorageFactory.disconnectAll();
  }
}
