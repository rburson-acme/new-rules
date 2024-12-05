import { Message } from "../thredlib";

  export interface Dispatcher {
    dispatch(message: Message): Promise<void>;
    shutdown(delay?: number): Promise<void>;
  }