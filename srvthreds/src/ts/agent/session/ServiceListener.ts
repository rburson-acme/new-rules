export interface ServiceListener {
  newSession(
    { sessionId, nodeId, data }: { sessionId: string; nodeId: string; data?: Record<string, any> },
    participantId: string,
    channelId: string,
  ): Promise<void>;
  sessionEnded(sessionId: string): Promise<void>;
}
