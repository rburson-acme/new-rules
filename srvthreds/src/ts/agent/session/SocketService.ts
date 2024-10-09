
import { Server } from 'socket.io';
import express, { Express } from 'express';
import http from 'http';
import { Event, Logger, StringMap } from '../../thredlib/index.js';
import { SessionService } from './SessionService.js';
import { Auth } from '../../auth/Auth.js';
import { BasicAuth } from '../../auth/BasicAuth.js';
import { Socket } from 'socket.io';

export interface SocketServiceParams {
    sessionService: SessionService;
    publisher: (event: Event, participantId: string) => Promise<void>;
    nodeId: string;
    httpServer?: http.Server;
    port?: number,
    auth?: Auth
}
export class SocketService {

    private httpServer: http.Server;
    private sessionService: SessionService;
    private publisher: (event: Event, participantId: string) => Promise<void>;
    private nodeId: string;
    private channels: StringMap<(event: Event, channelId: string) => void> = {};
    private io: Server;
    private auth: Auth;

    constructor(params: SocketServiceParams) {
        this.sessionService = params.sessionService;
        this.auth = params.auth || new BasicAuth();
        this.publisher = params.publisher;
        this.nodeId = params.nodeId;
        this.httpServer = params.httpServer ? params.httpServer : this.createServer(params.port);
        this.io = new Server(this.httpServer);
        this.io.on('connection', this.onConnect);
    }

    // Handle outbound Messages (event + to)
    public send = (event: Event, channelId: string) => {
        const channel = this.channels[channelId];
        if (channel) {
            channel(event, channelId);
        } else {
            Logger.debug(`server: channel ${channelId} not found`);
        }
    }

    private createServer(port?: number): http.Server {
        const app: Express = express();
        const httpServer = http.createServer(app);
        const resolvedPort = port || 3000;
        httpServer.listen(resolvedPort, function () {
            Logger.info(`listening on *:${resolvedPort}`);
        });
        return httpServer;
    }

    private onConnect = (socket: Socket) => {

        // this.auth.authenticate(token);
        const participantId = socket.handshake.auth.token;
        // @TODO!!!  Research whether or not auth.token is a secure way to send the token in the future for authentication
        // a valid token should be mapped to a sessionId, which could be retrieved and reused here
        // i.e. for a given auth token, we need a consistent sessionId
        const sessionId = `${participantId}_${Date.now()}`;
        const channelId = socket.id;
        Logger.debug(`server: a user connected on channel ${channelId} as ${participantId} session ${sessionId}`);
        this.channels[channelId] = this.sendSocket;
        // for websockets, session must include a node id (so that we can route message back here)
        this.sessionService.addSession({ id: sessionId, nodeId: this.nodeId }, participantId, channelId).then(() => {
            socket.on('disconnect', () => {
                delete this.channels[channelId];
                this.sessionService.removeSession(sessionId).then(() => {
                    Logger.debug(`server: user ${participantId} disconnected`);
                }).catch((e) => {
                    Logger.debug(`server: user ${participantId}::${sessionId} failed to remove Session`);
                });
            });
            // Handle inbound Events
            socket.on('message', (event: Event, fn) => {
                // @TODO - verify event source IS participantId (no spoofing!)
                this.publisher(event, participantId).catch(e => {
                    Logger.debug(`server: publish ${event.id} failed for ${participantId}`, e);
                });
            });
        }).catch((e) => {
            Logger.debug(`server: user ${participantId}::${sessionId} failed to add Session`);
        })
    };

    private sendSocket = (event: Event, channelId: string) => {
        const toSocket = this.io.of('/').sockets.get(channelId);
        if (toSocket && toSocket.connected) {
            toSocket.send(event);
        } else {
            Logger.debug(`server: socket ${channelId} is not connected`);
        }
    }

    async shutdown(): Promise<void> {
        await new Promise<void>((resolve, reject) => {
            this.io.close(function onServerClosed(err: any) {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            })
        }),
        await new Promise<void>((resolve, reject) => {
            // wait for disconnected sockets to fire session removals
            setTimeout(() => {
                resolve();
            }, 3000);
        })
    }

}
