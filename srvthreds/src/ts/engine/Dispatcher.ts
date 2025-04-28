import { MessageTemplate } from "./MessageTemplate";

export interface Dispatcher {
    tell(messageTemplate: MessageTemplate): Promise<void>;
}