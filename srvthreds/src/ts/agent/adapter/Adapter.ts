import { Event } from '../../thredlib/index.js';

export interface Adapter {
  initialize(): Promise<void>;
  execute(event: Event): Promise<any>;
}
