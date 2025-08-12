import { Message } from '../thredlib/index.js';
import { MessageTemplate } from './MessageTemplate';
import { ThredStore } from './store/ThredStore';
import { ThredContext } from './ThredContext';

export interface MessageHandler {
  handleMessage(messageTemplate: MessageTemplate): Promise<void>;
  shutdown(delay?: number): Promise<void>;
}
