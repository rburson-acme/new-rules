
import { Event } from '../core/Event.js';
import { Address, Persistent } from '../index.js';
export interface EventRecord extends Persistent{
    event: Event;
    timestamp: number;
    thredId?: string;
    error?: any;
    to?: string[];
}