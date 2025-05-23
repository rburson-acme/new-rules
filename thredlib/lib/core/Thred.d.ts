import { ReactionModel } from "../model/ReactionModel.js";
export interface Thred {
    id: string;
    patternId: string;
    patternName: string;
    currentReaction?: {
        reactionName?: string;
        expiry: ReactionModel['expiry'];
    };
    broadcastAllowed: boolean;
    startTime: number;
    endTime?: number;
    status: ThredStatus;
}
export declare enum ThredStatus {
    ACTIVE = "a",
    FINISHED = "f",
    TERMINATED = "t"
}
