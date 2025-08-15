import { Storage, Types } from '../../storage/Storage.js';
import { Parallel } from '../../thredlib/index.js';

export class ParticipantsStore {
  constructor(private storage: Storage) {}

  addThredToParticipants(participantIds: string[], thredId: string): Promise<void> {
    return Parallel.forEach(participantIds, (participantId) => {
      return this.storage.addToSet(Types.ParticipantThreds, thredId, participantId);
    });
  }

  getParticipantThreds(participantId: string): Promise<string[]> {
    return this.storage.retrieveSet(Types.ParticipantThreds, participantId);
  }

  removeThredFromParticipants(participantIds: string[], thredId: string): Promise<void> {
    return Parallel.forEach(participantIds, (participantId) => {
      return this.storage.removeFromSet(Types.ParticipantThreds, thredId, participantId);
    });
  }

  removeThredFromParticipant(participantId: string, thredId: string): Promise<void> {
    return this.storage.removeFromSet(Types.ParticipantThreds, thredId, participantId);
  }

  removeParticipant(participantId: string): Promise<void> {
    return this.storage.deleteSet(Types.ParticipantThreds, participantId);
  }
}
