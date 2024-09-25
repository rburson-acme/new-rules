import { Event } from '../core/Event.js';
import { Connection } from './Connection.js';
import { SocketIOConnection } from './SocketIOConnection.js';

export class EventManager {
    
    consumers:Set<(event: Event)=>void> = new Set();
    private connection?:Connection;

    connect(url:string, options:{}):Promise<void> {
        this.connection = new SocketIOConnection(url, options);
        const connect = () => (this.connection as Connection).setListener(this.connectionListener);
        return this.connection.connect().then(connect);
    }

    disconnect(): void {
        this.connection?.disconnect();
    }

    dispatch(event:Event): void {
        if(!this.connection) throw new Error(`Engine not connected`);
        this.connection.send(event);
    }

    private connectionListener = (event: Event):void => {
        this.consumers.forEach(consumer => consumer(event));
    }
}