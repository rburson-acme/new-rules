import { Event } from '../../thredlib';

export interface Adapter {
  initialize(): Promise<void>;
  execute(event: Event): Promise<any>;
}
