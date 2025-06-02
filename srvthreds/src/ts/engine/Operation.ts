import { ThredContext } from './ThredContext.js';
import { Event } from '../thredlib/index.js';

export interface Operation {
  apply(event: Event, context: ThredContext): boolean;
}
