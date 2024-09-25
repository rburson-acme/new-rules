import { Event } from '../core/Event.js';
export declare class EventManager {
    consumers: Set<(event: Event) => void>;
    private connection?;
    connect(url: string, options: {}): Promise<void>;
    disconnect(): void;
    dispatch(event: Event): void;
    private connectionListener;
}
