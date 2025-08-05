export interface ServiceListener {
  newSession(
    { sessionId, nodeId }: { sessionId: string; nodeId: string },
    participantId: string,
    channelId: string,
  ): Promise<void>;
  sessionEnded(sessionId: string): Promise<void>;
}
