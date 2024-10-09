import { Logger } from '../thredlib/index.js';
import { QService, QMessage } from "./QService.js";

export class LocalQService<T> implements QService<T> {

    private q: QMessage<T>[] = [];
    private delivered: QMessage<T>[] = [];
    private notifyQ: (() => void)[] = [];

    async pop(topics: string[]): Promise<QMessage<T>> {
        const { q } = this;
        if (q.length) {
            const next = this.q.pop();
            this.delivered.unshift(next as never);
            return next as never;
        }
        return new Promise((resolve) => {
            this.notifyQ.unshift(() => {
                const next = this.q.pop();
                this.delivered.unshift(next as never);
                resolve(next as never);
            });
        });
    }

    reject(message: QMessage<T>, err?: Error): Promise<void> {
        Logger.error(`Rejecting message: ${err?.message}`, err);
        return this.delete(message);
    }

    requeue(message: QMessage<T>, err?: Error): Promise<void> {
        Logger.error(`Requeueing message after: ${err?.message}`, err);
        return this.queue(message);
    }

    async queue(message: QMessage<T>): Promise<void> {
        this.q.unshift(message);
        const next = this.notifyQ.pop();
        next && next();
    }

    async delete(message: QMessage<T>): Promise<void> {
        const { id } = message;
        const index = this.delivered.findIndex(message => id === message.id);
        if (index > -1) {
            this.delivered.splice(index, 1);
        }
    }

}