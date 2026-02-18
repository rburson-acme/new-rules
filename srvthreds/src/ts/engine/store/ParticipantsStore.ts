import { Storage, Types } from '../../storage/Storage.js';

export class ParticipantsStore {
  constructor(private storage: Storage) {}

  async addThredToParticipants(participantIds: string[], thredId: string): Promise<void> {
    const transaction = this.storage.newTransaction();
    participantIds.forEach((participantId) =>
      this.storage.addToSet({ type: Types.ParticipantThreds, item: thredId, setId: participantId, transaction }),
    );
    await transaction.execute();
  }

  getParticipantThreds(participantId: string): Promise<string[]> {
    return this.storage.retrieveSet({ type: Types.ParticipantThreds, setId: participantId });
  }

  async removeThredFromParticipants(participantIds: string[], thredId: string): Promise<void> {
    const transaction = this.storage.newTransaction();
    participantIds.forEach((participantId) =>
      this.storage.removeFromSet({ type: Types.ParticipantThreds, item: thredId, setId: participantId, transaction }),
    );
    await transaction.execute();
  }

  removeThredFromParticipant(participantId: string, thredId: string): Promise<void> {
    return this.storage.removeFromSet({ type: Types.ParticipantThreds, item: thredId, setId: participantId });
  }

  removeParticipant(participantId: string): Promise<void> {
    return this.storage.deleteSet({ type: Types.ParticipantThreds, setId: participantId });
  }
}
