import { Event, Message } from '../thredlib/index.js';
import { QService, QMessage } from './QService.js';

export class MessageQ {
  constructor(private messageQ: QService<Message>) {}

  async pop(topics?: string[]): Promise<QMessage<Message>> {
    // @TODO implement topics
    return await this.messageQ.pop();
  }

  queue(message: Message, topics?: string[]): Promise<void> {
    return this.messageQ.queue({ id: message.id, payload: message, topics: topics });
  }

  delete(message: QMessage<Message>): Promise<void> {
    return this.messageQ.delete(message);
  }

  reject(message: QMessage<Message>, err?: Error): Promise<void> {
    return this.messageQ.reject(message, err);
  }

  requeue(message: QMessage<Message>, err?: Error): Promise<void> {
    return this.messageQ.requeue(message, err);
  }
}
