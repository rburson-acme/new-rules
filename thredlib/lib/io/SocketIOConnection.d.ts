import { Event } from '../core/Event.js';
import { Connection } from './Connection.js';
export declare class SocketIOConnection implements Connection {
    private url;
    private options;
    private socket;
    private listener;
    constructor(url: string, options: {});
    connect(): Promise<void>;
    disconnect(): void;
    setListener(listener: (event: Event) => void): void;
    send(event: Event): void;
    private registerConnectErrors;
    private onMessage;
}
