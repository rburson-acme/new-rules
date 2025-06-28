import { ReactionModel } from '../model/ReactionModel.js';
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
    lastUpdateTime: number;
    endTime?: number;
    status: ThredStatus;
    meta: {
        label?: string;
        description?: string;
        displayUri?: string;
    };
}
export declare enum ThredStatus {
    ACTIVE = "a",
    FINISHED = "f",
    TERMINATED = "t"
}
