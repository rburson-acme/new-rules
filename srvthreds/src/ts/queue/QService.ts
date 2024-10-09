import { Event } from '../thredlib/index.js';

export interface QMessage<T> {
    id: string,
    payload: T,
    topics?: string[],
    replyHandle?: QMessageReplyHandle
}

export interface QMessageReplyHandle {
}
export interface QService<T> {

    pop(topics?: string[]): Promise<QMessage<T>>;

    queue(message: QMessage<T>): Promise<void>;

    delete(message: QMessage<T>): Promise<void>;

    reject(message: QMessage<T>, err?: Error): Promise<void>;
    
    requeue(message: QMessage<T>, err?: Error): Promise<void>;

}