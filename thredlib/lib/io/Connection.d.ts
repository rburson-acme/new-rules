import { Event } from '../core/Event.js';
export interface Connection {
    connect(): Promise<void>;
    send(event: Event): void;
    setListener(listener: (data: any) => void): void;
    disconnect(): void;
}
