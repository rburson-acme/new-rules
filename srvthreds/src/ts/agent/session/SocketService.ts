import { Server } from 'socket.io';
import express, { Express } from 'express';
import http from 'http';
import { Event, Logger, Message, StringMap } from '../../thredlib/index.js';
import { Auth } from '../../auth/Auth.js';
import { BasicAuth } from '../../auth/BasicAuth.js';
import { Socket } from 'socket.io';
import { EventPublisher } from '../AgentService.js';
import { ServiceListener } from './ServiceListener.js';

export interface SocketServiceParams {
  serviceListener: ServiceListener;
  publisher: EventPublisher;
  nodeId: string;
  httpServer: http.Server;
  auth: Auth;
}

export interface SocketData {
  participantId: string;
}

/**
 * This service handles websocket connections, sending and recieveing events to clients.
 * It also handles mapping sessions to external channels (i.e. sockets)
 */

export class SocketService {
  private httpServer: http.Server;
  private serviceListener: ServiceListener;
  private publisher: EventPublisher;
  private nodeId: string;
  private channels: StringMap<(messageOrEvent: any, channelId: string) => void> = {};
  private io: Server;
  private auth: Auth;

  constructor(params: SocketServiceParams) {
    this.serviceListener = params.serviceListener;
    this.auth = params.auth;
    this.publisher = params.publisher;
    this.nodeId = params.nodeId;
    this.httpServer = params.httpServer;
    this.io = new Server<SocketData>(this.httpServer);
    this.io.use(this.authenticate);
    this.io.on('connection', this.onConnect);
  }

  // Handle outbound Messages (event + to)
  public send = (messageOrEvent: Message | Event, channelId: string) => {
    const channel = this.channels[channelId];
    if (channel) {
      channel(messageOrEvent, channelId);
    } else {
      Logger.error({ msg: `session: channel ${channelId} not found` });
    }
  };

  // see this page for client handling of Auth error
  // https://socket.io/docs/v4/middlewares/
  private authenticate = (socket: Socket, next: (err?: any) => void) => {
    socket.data.participantId = socket.handshake.auth.token;
    next();
    // UNCOMMENT TO TURN ON AUTHENTICATION
    /* const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication error: No token'));
    Logger.debug({ msg:`session: validation successful for: token ${token}` });

    // use auth to validate the token here
    this.auth.validateAccessToken(token).then((payload) => {
      socket.data.participantId = payload.participantId;
      next();
    }).catch((err) => {
      Logger.error({ msg:`session: validation failed for: token ${token}`, err });
      next(new Error('Authentication error: Invalid token'));
    });
    */
  };

  private onConnect = (socket: Socket) => {
    const participantId = socket.data.participantId;
    // check for proxy directive - client can request to proxy messages
    const isProxy = !!socket.handshake.headers['x-proxy-message'];
    const sessionId = `${participantId}_${Date.now()}`;
    const channelId = socket.id;
    Logger.info({
      msg: `session: a client connected on channel ${channelId} as ${participantId} session ${sessionId}`,
    });
    this.channels[channelId] = this.sendSocket;
    // for websockets, session must include a node id (so that we can route message back here)
    this.serviceListener
      .newSession({ sessionId, nodeId: this.nodeId, data: { isProxy } }, participantId, channelId)
      .then(() => {
        socket.on('disconnect', () => {
          delete this.channels[channelId];
          this.serviceListener
            .sessionEnded(sessionId)
            .then(() => {
              Logger.info({ msg: `session: participant ${participantId} disconnected` });
            })
            .catch((e) => {
              Logger.error({
                msg: `session: participant ${participantId}::${sessionId} failed to remove Session`,
                err: e as Error,
              });
            });
        });
        // Handle inbound Events
        socket.on('message', (event: Event, fn) => {
          // @TODO - verify event source IS participantId (no spoofing!)
          this.publisher.publishEvent({ ...event, source: { id: participantId } }).catch((e) => {
            Logger.debug(`session: publish ${event.id} failed for ${participantId}`, e);
          });
        });
      })
      .catch((e) => {
        Logger.error({
          msg: `session: participant ${participantId}::${sessionId} failed to add Session`,
          err: e as Error,
        });
      });
  };

  private sendSocket = (messageOrEvent: any, channelId: string) => {
    const toSocket = this.io.of('/').sockets.get(channelId);
    if (toSocket && toSocket.connected) {
      toSocket.send(messageOrEvent);
    } else {
      Logger.error({ msg: `session: socket ${channelId} is not connected` });
    }
  };

  async shutdown(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this.io.close(function onServerClosed(err: any) {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    }),
      await new Promise<void>((resolve, reject) => {
        // wait for disconnected sockets to fire session removals
        setTimeout(() => {
          resolve();
        }, 3000);
      });
  }
}
