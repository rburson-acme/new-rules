import { SessionService } from "./SessionService";
import { ServiceListener } from "./SocketService";

export class SessionServiceListener implements ServiceListener {
    constructor(private sessionService: SessionService) {}
  
    async newSession(
      { sessionId, nodeId }: { sessionId: string; nodeId: string },
      participantId: string,
      channelId: string,
    ): Promise<void> {
      this.sessionService.addSession({ id: sessionId, nodeId }, participantId, channelId);
    }
  
    async sessionEnded(sessionId: string): Promise<void> {
      this.sessionService.removeSession(sessionId);
    }
  }