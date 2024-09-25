
import io, { Socket } from 'socket.io-client';
import { Event } from '../core/Event.js';
import { Connection } from './Connection.js';

export class SocketIOConnection implements Connection{

    private socket: Socket | undefined;
    private listener: (event: Event)=>void;

    constructor(private url:string, private options:{}) {
        this.listener = ()=>{};
    }

    // @TODO
    // authenticate();

    public connect(): Promise<void> {
        return new Promise((resolve, reject)=>{
            this.socket = io(this.url, this.options);
            this.socket.on('connect', ()=>{
                console.log('connected!');
                resolve();
            });
            this.socket.on('message', this.onMessage);
            this.registerConnectErrors(['error', 'connect_error', 'connect_timeout'], reject);
        });
    }

    public disconnect(): void {
        this.socket?.disconnect();
    }

    setListener(listener:(event: Event)=>void): void {
        this.listener = listener;
    }

    public send(event: Event): void {
        this.socket?.send(event);
    }

    private registerConnectErrors(errorNames:Array<string>, reject: (error: Error) => void): void {
        errorNames.forEach(errorName => this.socket?.on(errorName, reject));
    }

    private onMessage = (event: Event): void => {
        this.listener(event);
    }

}