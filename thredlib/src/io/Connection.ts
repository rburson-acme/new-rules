import { Event } from '../core/Event.js';
import { Message } from '../core/Message.js';

export interface Connection {
    connect(): Promise<void>;
    send(event: Event): void;
    setListener(listener:(data: any)=>void): void;
    disconnect(): void; 
}