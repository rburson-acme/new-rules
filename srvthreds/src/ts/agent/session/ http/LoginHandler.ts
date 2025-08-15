import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { get } from 'http';
import { ServiceListener } from '../ServiceListener.js';
import { EventPublisher } from '../../AgentService.js';

export const getHandleLogin = ({
  serviceListener,
  publisher,
  nodeId,
}: {
  serviceListener: ServiceListener;
  publisher: EventPublisher;
  nodeId: string;
}) => {
  // @TODO RLS-141 - use BasicAuth to generate a sessionId and signed token with encoded participantId and sessionId.  create a session with the sessionId

  // @TODO - implement a real user store in MongoDB
  return async (req: Request<{}, any>, res: Response<any, any>) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).send('Username and password are required.');
    }
    const user = { username: 'temp', password: 'temp' }; // find user
    if (!user) {
      return res.status(401).send('Invalid username or password.');
    }
    try {
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (passwordMatch) {
        res.send('temp_token'); // In a real app, you'd set a session or return a token
      } else {
        res.status(401).send('Invalid username or password.');
      }
    } catch (error) {
      console.error('Error during login:', error);
      res.status(500).send('Error logging in.');
    }
  };
};
