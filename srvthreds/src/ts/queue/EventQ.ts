import { Event } from '../thredlib/index.js';
import { QService, QMessage } from './QService.js';

export class EventQ {
  constructor(private messageQ: QService<Event>) {}

  async pop(topics?: string[]): Promise<QMessage<Event>> {
    return await this.messageQ.pop();
  }

  queue(event: Event, topics?: string[]): Promise<void> {
    if (!event.time) event.time = Date.now();
    return this.messageQ.queue({ id: event.id, payload: event, topics: topics });
  }

  delete(message: QMessage<Event>): Promise<void> {
    return this.messageQ.delete(message);
  }

  reject(message: QMessage<Event>, err?: Error): Promise<void> {
    return this.messageQ.reject(message, err);
  }

  requeue(message: QMessage<Event>, err?: Error): Promise<void> {
    return this.messageQ.requeue(message, err);
  }
}
