import { Storage, Types } from '../../storage/Storage';

export class ParticipantsStore {
  constructor(private storage: Storage) {}

  addThredToParticipant(participantId: string, thredId: string): Promise<void> {
    return this.storage.addToSet(Types.ParticipantThreds, thredId, participantId);
  }

  getParticipantThreds(participantId: string): Promise<string[]> {
    return this.storage.retrieveSet(Types.ParticipantThreds, participantId);
  }

  removeThredFromParticipant(participantId: string, thredId: string): Promise<void> {
    return this.storage.removeFromSet(Types.ParticipantThreds, thredId, participantId);
  }

  removeParticipant(participantId: string): Promise<void> {
    return this.storage.deleteSet(Types.ParticipantThreds, participantId);
  }
}
