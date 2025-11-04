import { Request, Response } from 'express';
import { Event } from '../../thredlib/index.js';
import { EventPublisher } from '../AgentService.js';
import { Auth } from '../../auth/Auth.js';
import { AgentConfig } from '../../config/AgentConfig.js';

export const getHandleEvent = ({
  auth,
  publisher,
  agentConfig,
}: {
  auth: Auth;
  publisher: EventPublisher;
  agentConfig: AgentConfig;
}) => {
  return async (req: Request<{}, any>, res: Response<any, any>) => {
    const event: Event = req.body;

    const authHeader = req.headers['authorization'] as string;
    // expecting 'Bearer <token>'
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401); // Unauthorized

    try {
      if (event) {
        const validationResult = await auth.validateAccessToken(token);
        const participantId = validationResult.participantId;
        // Process the event - force use of authenticated participantId
        await publisher.publishEvent({ ...event, source: { id: participantId } });
        res.status(200).send('Event processed.');
      } else {
        res.status(401).send('No Event payload provided.');
      }
    } catch (error) {
      console.error('Error during token validation or event processing:', error);
      res.status(500).send('Error processing request.');
    }
  };
};
