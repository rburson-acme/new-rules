import { RedisClientType } from 'redis';
import { Transaction } from './Transaction.js';
import { Logger } from '../thredlib/index.js';

export class RedisTransaction implements Transaction {
  private results: any[] = [];
  isComplete = false;

  constructor(readonly multi: ReturnType<RedisClientType['multi']>) {}

  async execute(): Promise<any[]> {
    const results = await this.multi.exec();
    if (!results) throw new Error('Redis transaction failed: exec returned null');
    const errors = results.filter((r: any) => r instanceof Error);
    if (errors.length) {
      errors.forEach((e: Error) => Logger.error('Redis transaction error:', e));
      throw errors[0];
    }
    this.results = results;
    this.isComplete = true;
    return results;
  }

  getResultAt<T = any>(index: number): T {
    return this.results[index];
  }

  getResultAsJsonAt<T = any>(index: number): T | undefined {
    const r = this.results[index];
    return r ? JSON.parse(r) : undefined;
  }
}
