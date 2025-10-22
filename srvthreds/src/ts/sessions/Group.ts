import { GroupModel } from '../thredlib/index.js';

export class Group {
  readonly name: string;
  readonly participants: { participantId: string }[];

  constructor(groupModel: GroupModel) {
    this.name = groupModel.name;
    this.participants = groupModel.participants;
  }

  getParticipantIds() {
    return this.participants.map((participant) => participant.participantId);
  }
}
