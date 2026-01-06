import { SessionService } from './SessionService.js';
import { ServiceListener } from './ServiceListener.js';
import { UserController } from '../../persistence/controllers/UserController.js';

export class SessionServiceListener implements ServiceListener {
  constructor(private sessionService: SessionService) {}

  async newSession(
    { sessionId, nodeId, data = {} }: { sessionId: string; nodeId: string; data?: Record<string, any> },
    participantId: string,
    channelId: string,
  ): Promise<void> {
    this.sessionService.addSession({ id: sessionId, nodeId, data }, participantId, channelId);
  }

  async sessionEnded(sessionId: string): Promise<void> {
    this.sessionService.removeSession(sessionId);
  }
}
