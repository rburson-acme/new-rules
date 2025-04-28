import { Message } from "../thredlib";
import { MessageTemplate } from "./MessageTemplate";
import { ThredContext } from "./ThredContext";

  export interface MessageHandler {
    handleMessage(messageTemplate: MessageTemplate, thredContext?: ThredContext): Promise<void>;
    shutdown(delay?: number): Promise<void>;
  }