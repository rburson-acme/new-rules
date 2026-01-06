import { Request, Response } from 'express';
import { Event, Events, EventValues, Id } from '../../thredlib/index.js';
import { EventPublisher } from '../AgentService.js';
import { AgentConfig } from '../../config/AgentConfig.js';
import { Authentication } from '../../auth/Authentication.js';

/**
 * Allows for POSTING of the 'values' payload for an event
 */
export const getHandleEventValues = ({
  publisher,
  agentConfig,
  auth,
}: {
  publisher: EventPublisher;
  agentConfig: AgentConfig;
  auth: Authentication;
}) => {
  return async (req: Request<{ thredId: string; re?: string }, any>, res: Response<any, any>) => {
    const { thredId, re } = req.params;
    const values: EventValues['values'] = req.body;

    const authHeader = req.headers['authorization'] as string;
    // expecting 'Bearer <token>'
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401); // Unauthorized

    try {
      // Validate the access token
      const validationResult = await auth.validateAccessToken(token);
      const participantId = validationResult.participantId;
      const event = publisher.createOutboundEvent({ content: { values }, prevEvent: { thredId, re } });
      publisher.publishEvent({ ...event, source: { id: participantId } });
    } catch (error) {
      console.error('Error during token validation or event processing:', error);
      res.status(500).send('Error processing request.');
    }
  };
};
