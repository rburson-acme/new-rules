import { Request, Response } from 'express';
import { EventPublisher } from '../../AgentService.js';
import { Auth } from '../../../auth/Auth.js';
import { AgentConfig } from '../../Config.js';

export const getHandleLogin = ({
  auth,
  publisher,
  agentConfig,
}: {
  auth: Auth;
  publisher: EventPublisher;
  agentConfig: AgentConfig;
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
  auth,
  publisher,
  agentConfig,
}: {
  auth: Auth;
  publisher: EventPublisher;
  agentConfig: AgentConfig;
}) => {
  // @TODO need to create error codes for better error reporting back the client
  return async (req: Request<{}, any>, res: Response<any, any>) => {
    const authHeader = req.headers['authorization'] as string;
    // expecting 'Bearer <token>'
    const refreshToken = authHeader && authHeader.split(' ')[1];
    if (!refreshToken) return res.status(400).send('Refresh token is required.');
    try {
      const accessResult = await auth.refresh(refreshToken);
      res.status(200).json(accessResult);
    } catch (error) {
      console.error('Refresh Failed', error);
      res.status(500).send('Refresh Failed');
    }
  };
};

export const getHandleLogout = ({
  auth,
  publisher,
  agentConfig,
}: {
  auth: Auth;
  publisher: EventPublisher;
  agentConfig: AgentConfig;
}) => {
  // @TODO need to create error codes for better error reporting back the client
  return async (req: Request<{}, any>, res: Response<any, any>) => {
    const authHeader = req.headers['authorization'] as string;
    // expecting 'Bearer <token>'
    const refreshToken = authHeader && authHeader.split(' ')[1];
    if (!refreshToken) return res.status(400).send('Refresh token is required.');
    await auth.logout(refreshToken);

    try {
      await auth.logout(refreshToken);
      res.status(200).send('OK');
    } catch (error) {
      console.error('Logout Failed', error);
      res.status(500).send('Logout Failed');
    }
  };
};
