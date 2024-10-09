import { Logger, Message, SessionsModel, StringMap } from '../../thredlib/index.js';
import { ResolverConfig } from "../../sessions/Config.js";
import { Session } from "../../sessions/Session.js";
import { Sessions } from "../../sessions/Sessions.js";
import { SessionStorage } from "../../sessions/storage/SessionStorage.js";
import { StorageFactory } from "../../storage/StorageFactory.js";

export class SessionService {

    private sessions: Sessions;
    private sessionChannelIds: StringMap<string> = {};

    constructor(sessionsModel: SessionsModel, resolverConfig: ResolverConfig) {
        this.sessions = new Sessions(sessionsModel, resolverConfig, new SessionStorage(StorageFactory.getStorage()));
    }

    async addSession(session: Session, participantId: string, channelId: string): Promise<void> {
        const { id: sessionId } = session;
        const { sessions, sessionChannelIds } = this;
        // if thise session already exists, just map it to the new channel
        // this likely means the client has disconnected and reconnected
        if (!(await sessions.exists(sessionId, participantId))) {
            await sessions.addSession(session, participantId);
        }
        sessionChannelIds[sessionId] = channelId;
    }

    async removeSession(sessionId: string): Promise<void> {
        await this.sessions.removeSession(sessionId);
        delete this.sessionChannelIds[sessionId];
    }

    async removeParticipant(participantId: string): Promise<void> {
        const sessionIds: string[] = await this.sessions.getSessionIdsFor(participantId);
        sessionIds.forEach(sessionId => delete this.sessionChannelIds[sessionId]);
        return this.sessions.removeParticipant(participantId);
    }

    newSessionId(): Promise<string> {
        return this.sessions.newSessionId();
    }

    // map recipients to channelIds
    async getChannels(message: Message): Promise<string[]> {
        const { sessions, sessionChannelIds } = this;
        const { event, to } = message;
        Logger.trace(`SessionService: getChannels for: ${to}`, event);

        const sessionsByParticipant: StringMap<string[]> = await sessions.getSessionIdsForAll(to);
        if (!Object.keys(sessionsByParticipant).length) {
            Logger.warn(`SessionService: No participants are logged in for address ${to}`);
            return [];
        }
        const channelIds: string[] = [];
        Object.keys(sessionsByParticipant).forEach(participantId => {
            const sessionIds = sessionsByParticipant[participantId];
            if (sessionIds.length) {
                sessionIds.forEach(sessionId => {
                    const channelId = sessionChannelIds[sessionId];
                    if (channelId) {
                        channelIds.push(channelId);
                    } else {
                        // If the sessionId is no longer mapped to a channel, then the session must be an orphan
                        this.removeSession(sessionId).catch(e => `Failed to remove orphaned Session: ${sessionId}`);
                        Logger.error(`SessionService: no channel found for session ${sessionId} participant ${participantId}`);
                    }
                });
            } else {
                Logger.error(`SessionService: participant ${to} not found`);
            }
        });
        return channelIds;
    }

    async shutdown() {
        await StorageFactory.disconnectAll();
    }

}