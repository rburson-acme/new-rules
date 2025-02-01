export interface AdminThred {
  id: string;
  patternId: string;
  patternName: string;
  startTime: number;
  currentReaction: {
    reactionName: string;
  };
}
