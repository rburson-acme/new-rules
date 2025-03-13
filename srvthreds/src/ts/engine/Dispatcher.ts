import { Message } from "../thredlib";
import { MessageTemplate } from "./MessageTemplate";
import { ThredContext } from "./ThredContext";

  export interface Dispatcher {
    dispatch(messageTemplate: MessageTemplate, thredContext?: ThredContext): Promise<void>;
    shutdown(delay?: number): Promise<void>;
  }