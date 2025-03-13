import { Event } from './Event.js';
export interface Message {
    id: string;
    to: string[];
    event: Event;
}
