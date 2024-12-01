import { Message } from "./Message";

  export interface Dispatcher {
    dispatch(message: Message): void;
    shutdown(delay?: number): Promise<void>;
  }