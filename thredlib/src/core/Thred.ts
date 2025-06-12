import { ReactionModel } from "../model/ReactionModel.js";

export interface Thred {
      id: string;
      patternId: string;
      patternName: string;
      currentReaction?: {
        reactionName?: string,
        expiry: ReactionModel['expiry']
      };
      broadcastAllowed: boolean;
      startTime: number;
      endTime?: number;
      status: ThredStatus;
}

export enum ThredStatus {
  ACTIVE = 'a',
  // note finished is also and 'active' thred
  FINISHED = 'f',
  // these are considered 'archived' threds
  TERMINATED = 't',
}