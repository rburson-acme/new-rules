import { Server } from 'socket.io';
import express, { Express } from 'express';
import http from 'http';
import { Event, Logger, StringMap } from '../../thredlib/index.js';
import { Auth } from '../../auth/Auth.js';
import { BasicAuth } from '../../auth/BasicAuth.js';
import { Socket } from 'socket.io';
import { EventPublisher } from '../Agent.js';
import { ServiceListener } from './ServiceListener.js';

export interface SocketServiceParams {
  serviceListener: ServiceListener;
  publisher: EventPublisher;
  nodeId: string;
  httpServer: http.Server;
  auth?: Auth;
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
  private channels: StringMap<(event: Event, channelId: string) => void> = {};
  private io: Server;
  private auth: Auth;

  constructor(params: SocketServiceParams) {
    this.serviceListener = params.serviceListener;
    this.auth = params.auth || new BasicAuth();
    this.publisher = params.publisher;
    this.nodeId = params.nodeId;
    this.httpServer = params.httpServer;
    this.io = new Server(this.httpServer);
    this.io.use(this.authenticate);
    this.io.on('connection', this.onConnect);
  }

  // Handle outbound Messages (event + to)
  public send = (event: Event, channelId: string) => {
    const channel = this.channels[channelId];
    if (channel) {
      channel(event, channelId);
    } else {
      Logger.debug(`session: channel ${channelId} not found`);
    }
  };

  // see this page for client handling of Auth error
  // https://socket.io/docs/v4/middlewares/
  private authenticate = (socket: Socket, next: (err?: any) => void) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication error: No token'));
    Logger.debug(`session: validation successful for: token ${token}`);

    // @TODO RLS-141 - use basic auth to validate the token here

    this.auth.validate(token) ? next() : next(new Error('Authentication error: Invalid token'));
  };

  private onConnect = (socket: Socket) => {
    // this.auth.authenticate(token);
    // @TODO RLS-141 - obtain the participantId from the token here
    const participantId = socket.handshake.auth.token;
    // @TODO RLS-141 - token will be the sessionId (or contain it)
    const sessionId = `${participantId}_${Date.now()}`;
    const channelId = socket.id;
    Logger.debug(`session: a user connected on channel ${channelId} as ${participantId} session ${sessionId}`);
    this.channels[channelId] = this.sendSocket;
    // for websockets, session must include a node id (so that we can route message back here)
    this.serviceListener
      .newSession({ sessionId, nodeId: this.nodeId }, participantId, channelId)
      .then(() => {
        socket.on('disconnect', () => {
          delete this.channels[channelId];
          this.serviceListener
            .sessionEnded(sessionId)
            .then(() => {
              Logger.debug(`session: user ${participantId} disconnected`);
            })
            .catch((e) => {
              Logger.debug(`session: user ${participantId}::${sessionId} failed to remove Session`);
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
        Logger.debug(`session: user ${participantId}::${sessionId} failed to add Session`);
      });
  };

  private sendSocket = (event: Event, channelId: string) => {
    const toSocket = this.io.of('/').sockets.get(channelId);
    if (toSocket && toSocket.connected) {
      toSocket.send(event);
    } else {
      Logger.debug(`session: socket ${channelId} is not connected`);
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
