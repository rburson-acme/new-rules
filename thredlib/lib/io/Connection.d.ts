import { Event } from '../core/Event.js';
export interface Connection {
    connect(): Promise<void>;
    send(event: Event): void;
    setListener(listener: (event: Event) => void): void;
    disconnect(): void;
}
