import http from 'http';
import express from 'express';
import { Express } from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { getHandleLogin, getHandleRefresh } from './AuthHandler.js';
import { ServiceListener } from '../ServiceListener.js';
import { EventPublisher } from '../../AgentService.js';
import { getHandleEvent } from './EventHandler.js';
import { BasicAuth } from '../../../auth/BasicAuth.js';
import { Auth } from '../../../auth/Auth.js';

const DEFAULT_PORT = 3000;

export interface HttpServiceParams {
  serviceListener: ServiceListener;
  publisher: EventPublisher;
  nodeId: string;
  port?: number;
}

export class HttpService {
  httpServer: http.Server;
  private serviceListener: ServiceListener;
  private publisher: EventPublisher;
  private nodeId: string;
  private port?: number;

  constructor(serviceParams: HttpServiceParams) {
    this.serviceListener = serviceParams.serviceListener;
    this.publisher = serviceParams.publisher;
    this.nodeId = serviceParams.nodeId;
    this.port = serviceParams.port;
    const app: Express = express();
    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(bodyParser.json());
    // cors needs to be confgured more granularly here
    app.use(cors());

    const auth: Auth = BasicAuth.getInstance();
    app.post(
      '/login',
      getHandleLogin({ auth, serviceListener: this.serviceListener, publisher: this.publisher, nodeId: this.nodeId }),
    );
    app.post(
      '/refresh',
      getHandleRefresh({ auth, serviceListener: this.serviceListener, publisher: this.publisher, nodeId: this.nodeId }),
    );
    app.post(
      '/event',
      getHandleEvent({ serviceListener: this.serviceListener, publisher: this.publisher, nodeId: this.nodeId }),
    );
    this.httpServer = http.createServer(app);
  }

  start() {
    /*const httpServer = https.createServer({
    key: fs.readFileSync(__dirname + '/config/privkey.pem'),
    cert: fs.readFileSync(__dirname + '/config/fullchain.pem'),
    ca: fs.readFileSync(__dirname + '/config/fullchain.pem')
  }, app);*/
    this.httpServer.listen(this.port || DEFAULT_PORT, () => {
      console.log(`LoginService is running on port ${this.port || DEFAULT_PORT}`);
    });
  }

  async shutdown(): Promise<void> {
    if (this.httpServer.listening) {
      return new Promise<void>((resolve, reject) => {
        this.httpServer.close((err) => {
          if (err) {
            console.error('Error shutting LoginService:', err);
            reject(err);
          } else {
            console.log('LoginService shutdown successful.');
            resolve();
          }
        });
      });
    }
  }
}
