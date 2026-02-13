import { Storage, Types } from '../../storage/Storage.js';
import { Parallel } from '../../thredlib/index.js';

export class ParticipantsStore {
  constructor(private storage: Storage) {}

  addThredToParticipants(participantIds: string[], thredId: string): Promise<void> {
    return Parallel.forEach(participantIds, (participantId) => {
      return this.storage.addToSet({ type: Types.ParticipantThreds, item: thredId, setId: participantId });
    });
  }

  getParticipantThreds(participantId: string): Promise<string[]> {
    return this.storage.retrieveSet({ type: Types.ParticipantThreds, setId: participantId });
  }

  removeThredFromParticipants(participantIds: string[], thredId: string): Promise<void> {
    return Parallel.forEach(participantIds, (participantId) => {
      return this.storage.removeFromSet({ type: Types.ParticipantThreds, item: thredId, setId: participantId });
    });
  }

  removeThredFromParticipant(participantId: string, thredId: string): Promise<void> {
    return this.storage.removeFromSet({ type: Types.ParticipantThreds, item: thredId, setId: participantId });
  }

  removeParticipant(participantId: string): Promise<void> {
    return this.storage.deleteSet({ type: Types.ParticipantThreds, setId: participantId });
  }
}
