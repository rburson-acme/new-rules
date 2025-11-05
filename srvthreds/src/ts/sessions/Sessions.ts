import { Address, Logger } from '../thredlib/index.js';
import { AddressResolver } from './AddressResolver.js';
import { StringMap } from '../thredlib/index.js';
import { SessionsModel } from '../thredlib/index.js';
import { SessionStorage } from './storage/SessionStorage.js';
import { SessionParticipant } from './SessionParticipant.js';
import { Session } from './Session.js';
import { ThredContext } from '../engine/ThredContext.js';
import { ResolverConfig } from '../config/ResolverConfig.js';
import { SessionsConfig } from '../config/SessionsConfig.js';

export class Sessions {
  private addressResolver: AddressResolver;

  constructor(
    private storage: SessionStorage,
    resolverConfig?: ResolverConfig,
    sessionsConfig?: SessionsConfig,
  ) {
    this.addressResolver = new AddressResolver(storage, resolverConfig, sessionsConfig);
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
    } catch (e) {
      Logger.error(`addSession(): Could not add session ${session.id}`);
      throw e;
    }
  }

  exists(sessionId: string, participantId: string): Promise<boolean> {
    return this.storage.exists(sessionId, participantId);
  }

  getSessionsFor(participantId: string): Promise<Session[]> {
    return this.storage.getSessionsFor(participantId);
  }

  getSessionIdsFor(participantId: string): Promise<string[]> {
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

  getParticipantIdsFor(address: Address, thredContext?: ThredContext): Promise<string[]> {
    const { addressResolver } = this;
    return addressResolver.getParticipantIdsFor(address, thredContext);
  }

  async getSessionIdsForParticipantIds(participantIds: string[]): Promise<StringMap<string[]>> {
    return this.storage.getSessionIdsForAll(participantIds);
  }

  async getSessionsForParticipantIds(participantIds: string[]): Promise<StringMap<Session[]>> {
    return this.storage.getSessionsForAll(participantIds);
  }

  getAllParticipantIds(): Promise<string[]> {
    return this.storage.getAllParticipantIds();
  }
}
