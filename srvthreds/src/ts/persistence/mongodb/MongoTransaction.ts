import { ClientSession } from 'mongodb';
import { Transaction } from '../Transaction.js';

export class MongoTransaction implements Transaction {
  constructor(private session: ClientSession) {}

  async start(): Promise<void> {
    this.session.startTransaction();
  }
  async commit(): Promise<void> {
    await this.session.commitTransaction();
    return this.session.endSession();
  }
  async rollback(): Promise<void> {
    await this.session.abortTransaction();
    return this.session.endSession();
  }

  getSession(): ClientSession {
    return this.session;
  }
}
