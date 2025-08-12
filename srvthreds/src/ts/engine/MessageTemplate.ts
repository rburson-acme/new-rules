import { Address, Event } from '../thredlib/index.js';

export interface MessageTemplate {
  to: Address;
  event: Event;
}
