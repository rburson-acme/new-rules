import { MessageTemplate } from './MessageTemplate.js';

export interface Dispatcher {
  tell(messageTemplate: MessageTemplate): Promise<void>;
}
