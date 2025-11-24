import http from 'http';
import express from 'express';
import { Request, Response } from 'express';
import { Express } from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { EventPublisher } from '../AgentService.js';
import { Auth } from '../../auth/Auth.js';
import { AgentConfig } from '../../config/AgentConfig.js';
import { Logger } from '../../thredlib/index.js';

const DEFAULT_PORT = 3000;

export interface HttpServiceParams {
  publisher: EventPublisher;
  agentConfig: AgentConfig;
  auth: Auth;
  port?: number;
  routes?: { handler: HttpHandlerFactory; method: 'get' | 'post' | 'put' | 'delete'; path: string }[];
}

export class HttpService {
  httpServer: http.Server;
  private publisher: EventPublisher;
  private agentConfig: AgentConfig;
  private port?: number;
  private routes?: { handler: HttpHandlerFactory; method: 'get' | 'post' | 'put' | 'delete'; path: string }[];
  private auth: Auth;

  constructor(serviceParams: HttpServiceParams) {
    this.publisher = serviceParams.publisher;
    this.agentConfig = serviceParams.agentConfig;
    this.port = serviceParams.port;
    this.routes = serviceParams.routes;
    this.auth = serviceParams.auth;
    const app: Express = express();
    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(bodyParser.json());
    // cors needs to be confgured more granularly here
    app.use(cors());

    if (this.routes) {
      this.routes.forEach((route) => {
        app[route.method](
          route.path,
          route.handler({ auth: this.auth, publisher: this.publisher, agentConfig: this.agentConfig }),
        );
      });
    }
    this.httpServer = http.createServer(app);
  }

  start() {
    /*const httpServer = https.createServer({
    key: fs.readFileSync(__dirname + '/config/privkey.pem'),
    cert: fs.readFileSync(__dirname + '/config/fullchain.pem'),
    ca: fs.readFileSync(__dirname + '/config/fullchain.pem')
  }, app);*/
    this.httpServer.listen(this.port || DEFAULT_PORT, () => {
      Logger.info(`LoginService is running on port ${this.port || DEFAULT_PORT}`);
    });
  }

  async shutdown(): Promise<void> {
    if (this.httpServer.listening) {
      return new Promise<void>((resolve, reject) => {
        this.httpServer.close((err) => {
          if (err) {
            Logger.error('Error shutting LoginService:', err);
            reject(err);
          } else {
            Logger.info('LoginService shutdown successful.');
            resolve();
          }
        });
      });
    }
  }
}

export type HttpHandlerFactory = ({
  auth,
  publisher,
  agentConfig,
}: {
  auth: Auth;
  publisher: EventPublisher;
  agentConfig: AgentConfig;
}) => (req: Request<any, any>, res: Response<any, any>) => Promise<any>;
