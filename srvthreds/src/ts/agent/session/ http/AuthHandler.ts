import { Request, Response } from 'express';
import { ServiceListener } from '../ServiceListener.js';
import { EventPublisher } from '../../AgentService.js';
import { BasicAuth } from '../../../auth/BasicAuth.js';
import { Auth } from '../../../auth/Auth.js';

export const getHandleLogin = ({
  auth,
  serviceListener,
  publisher,
  nodeId,
}: {
  auth: Auth;
  serviceListener: ServiceListener;
  publisher: EventPublisher;
  nodeId: string;
}) => {

  // @TODO need to create error codes for better error reporting back the client
  return async (req: Request<{}, any>, res: Response<any, any>) => {
    const { username: handle, password } = req.body;
    if (!handle || !password) {
      return res.status(400).send('Username and password are required.');
    }
    try {
      const authResult = await auth.login(handle, password);
      res.status(200).json(authResult);
    } catch (error) {
      console.error('Login Failed', error);
      res.status(500).send('Login Failed');
    }
  };
};

export const getHandleRefresh = ({
  serviceListener,
  publisher,
  nodeId,
  auth,
}: {
  serviceListener: ServiceListener;
  publisher: EventPublisher;
  nodeId: string;
  auth: Auth;
}) => {

  // @TODO need to create error codes for better error reporting back the client
  return async (req: Request<{}, any>, res: Response<any, any>) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).send('Refresh token is required.');
    }
    try {
      const accessResult = await auth.refresh(refreshToken);
      res.status(200).json(accessResult);
    } catch (error) {
      console.error('Refresh Failed', error);
      res.status(500).send('Refresh Failed');
    }
  };
};
