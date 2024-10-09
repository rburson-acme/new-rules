import { Address, Logger } from '../thredlib/index.js';
import { AddressResolver } from './AddressResolver.js';
import { StringMap } from '../thredlib/index.js';
import { SessionsModel } from '../thredlib/index.js';
import { SessionStorage } from './storage/SessionStorage.js';
import { SessionParticipant } from './SessionParticipant.js';
import { Session } from './Session.js';
import { ResolverConfig } from './Config.js';

export class Sessions {

    private addressResolver: AddressResolver;

    constructor(sessionsModel: SessionsModel, resolverConfig: ResolverConfig, private storage: SessionStorage) {
        this.addressResolver = new AddressResolver(sessionsModel.groups, resolverConfig, storage);
    }

    getAddressResolver(): AddressResolver {
        return this.addressResolver;
    }

    newSessionId(): Promise<string> {
        return this.storage.nextSessionId();
    }

    async addSession(session: Session, participantId: string): Promise<void> {
        try {
            await this.storage.addSession(session, participantId);
        } catch(e) {
            Logger.error(`addSession(): Could not add session ${session.id}`);
            throw e;
        }
    }
    
    exists(sessionId: string, participantId: string): Promise<boolean> {
        return this.storage.exists(sessionId, participantId);
    }
    
    getSessionsFor(participantId: string): Promise<Session[]>{
        return this.storage.getSessionsFor(participantId);
    }

    getSessionIdsFor(participantId: string): Promise<string[]>{
        return this.storage.getSessionIdsFor(participantId);
    }

    getSessionParticipant(sessionId: string): Promise<SessionParticipant | undefined> {
        return this.storage.getSessionParticipant(sessionId);
    }

    async hasAnySessions(participantId: string): Promise<boolean> {
        const sessionIds = await this.getSessionIdsFor(participantId);
        return sessionIds && sessionIds.length > 0;
    }

    removeSession(sessionId: string): Promise<void> {
        return this.storage.removeSession(sessionId);
    }

    removeParticipant(participantId: string): Promise<void> {
        return this.storage.removeParticipant(participantId);
    }

    removeAllParticipants(): Promise<void> {
        return this.storage.removeAllParticipants();
    }

    getParticipantIdsFor(address: Address | string[]): Promise<string[]> {
        const { addressResolver} = this;
        return addressResolver.getParticipantIdsFor(address);
    }

    async getSessionIdsForAll(address: Address | string[]): Promise<StringMap<string[]>>{
        const participantIds = await this.getParticipantIdsFor(address);
        return this.storage.getSessionIdsForAll(participantIds);
    }

    async getSessionsForAll(address: Address | string[]): Promise<StringMap<Session[]>>{
        const participantIds = await this.getParticipantIdsFor(address);
        return this.storage.getSessionsForAll(participantIds);
    }

    getAllParticipantIds(): Promise<string[]> {
        return this.storage.getAllParticipantIds();
    }
}