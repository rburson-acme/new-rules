import { Message } from '../thredlib/index.js';
import { MessageTemplate } from './MessageTemplate.js';
import { ThredStore } from './store/ThredStore.js';
import { ThredContext } from './ThredContext.js';

export interface MessageHandler {
  handleMessage(messageTemplate: MessageTemplate): Promise<void>;
}
