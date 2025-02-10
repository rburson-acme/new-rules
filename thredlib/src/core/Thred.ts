import { ReactionModel } from "../model/ReactionModel.js";

export interface Thred {
      id: string;
      patternId: string;
      patternName: string;
      currentReaction?: {
        reactionName?: string,
        expiry: ReactionModel['expiry']
      };
      startTime: number;
      endTime?: number;
}