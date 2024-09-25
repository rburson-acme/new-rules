import { Address } from './Address.js';
import { Event } from './Event.js';

export interface Message {
    id: string;
    to: Address | string[];
    event: Event;
}