import { Address, Event } from "../thredlib";

export interface MessageTemplate {
  to: Address;
  event: Event;
}
