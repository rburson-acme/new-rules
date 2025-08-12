import { Request, Response } from 'express';
import { Event } from '../../../thredlib/index.js';
import { ServiceListener } from '../ServiceListener.js';
import { EventPublisher } from '../../Agent.js';

export const getHandleEvent = ({
  serviceListener,
  publisher,
  nodeId,
}: {
  serviceListener: ServiceListener;
  publisher: EventPublisher;
  nodeId: string;
}) => {
  return async (req: Request<{}, any>, res: Response<any, any>) => {
    const event: Event = req.body;
    // @TODO RLS-141 - use basic auth to validate the token here and use participantId from the token
    // @TODO - get token from request headers or path and authenticate user to obtain sourceId and sessionId
    const participantId = event?.source?.id; // do this temporarily
    try {
      if (event) {
        // Process the event - force use of authenticated participantId
        publisher.publishEvent({ ...event, source: { id: participantId } });
      } else {
        res.status(401).send('No Event payload provided.');
      }
    } catch (error) {
      console.error('Error during login:', error);
      res.status(500).send('Error logging in.');
    }
  };
};
