
import { Event } from '../../thredlib/core/Event.js';
import { Address, Persistent } from '../../thredlib/index.js';
export interface EventRecord extends Persistent{
    event: Event;
    timestamp: number;
    thredId?: string;
    error?: any;
    to?: string[] | Address;
}