import { createClient, RedisClientType } from 'redis';
import Redlock, { Lock as RLock } from './Redlock.js';
import { Logger, Series } from '../thredlib/index.js';
import { Lock, Storage } from './Storage.js';
import { redisConfig } from '../config/RedisConfig.js';
import { Transaction } from './Transaction.js';
import { RedisTransaction } from './RedisTransaction.js';

interface LockWrapper extends Lock {
  lock: RLock;
}

export class RedisStorage implements Storage {
  // Locks will expire based on this value by default, if not specified explicitly during operations
  // However, they should always be released explicitly
  private static defaultLockTTL = 5000;
  private static DEFAULT_HOST = 'localhost:6379';

  private static redlockDefaults = {
    // the expected clock drift; for more details, see http://redis.io/topics/distlock
    driftFactor: 0.01, // time in ms
    // the max number of times Redlock will attempt to lock a resource before erroring
    retryCount: 50,
    // the time in ms between attempts
    retryDelay: 100,
    // see https://www.awsarchitectureblog.com/2015/03/backoff.html
    retryJitter: 200, // time in ms
  };
  private DATAKEY = 'data';

  private client: RedisClientType;
  private redlock: Redlock;

  //@TODO - set up sentinel or clustering

  constructor(hostString?: string) {
    const _host = hostString || process.env.REDIS_HOST || RedisStorage.DEFAULT_HOST;
    this.client = createClient(redisConfig(_host));

    this.client.on('error', function (error) {
      Logger.error(error);
    });
    this.client.on('ready', function () {
      /* Logger.info('Ready'); */
    });
    this.client.on('reconnect', function () {
      Logger.info('Redis reconnecting...');
    });
    this.client.on('end', function () {});

    // Connect the client
    this.client.connect().catch((error) => {
      Logger.error('Failed to connect to Redis:', error);
    });

    /*
        Adjust retryCount and retry delay upwards if too many clients are failing to acquire the same locked object
    */
    this.redlock = new Redlock([this.client], RedisStorage.redlockDefaults);
    this.redlock.on('error', function (err) {
      Logger.error(err);
    });
  }

  /*
        Disconnect from Redis
    */
  async disconnect(): Promise<void> {
    await this.client.quit();
  }

  /*
        Acquire locks on multiple resources, execute the operations, and release the locksa
        This method is preferred over manual lock management
  */
  async acquire({
    resources,
    ops,
    ttl,
  }: {
    resources: { type: string; id: string }[];
    ops: (() => Promise<any>)[];
    ttl?: number;
  }): Promise<any[]> {
    return this.redlock.using(
      resources.map(({ type, id }) => $toLockKey(type, id)),
      ttl || RedisStorage.defaultLockTTL,
      async (signal) => {
        const results = await Series.map(ops, (op) => {
          if (signal.aborted) {
            Logger.error('Acquire operation aborted!');
            throw signal.error;
          }
          return op();
        });
        return results;
      },
    );
  }

  // NOTE: Redis transactions are not atomic - some but not all writes might succeed.
  newTransaction(): Transaction {
    return new RedisTransaction(this.client.multi());
  }

  /*
        Save and add the id to the type index
    */
  async save({
    type,
    item,
    id,
    meta,
    transaction,
  }: {
    type: string;
    item: any;
    id: string;
    meta?: Record<string, string>;
    transaction?: Transaction;
  }): Promise<void> {
    // Logger.info(`Saving ${type} as ${JSON.stringify(item)}`);
    try {
      const multi = (transaction as RedisTransaction)?.multi || this.client.multi();
      const data = JSON.stringify(item);
      //multi.set($key(type, id), data);
      const fields = { [this.DATAKEY]: data, ...meta };
      multi.hSet($key(type, id), fields);
      this.addToIndex(type, id, multi);
      // Only execute if this is not part of an existing transaction
      if (!transaction) await multi.exec().then(this.checkMultiResult);
    } catch (e) {
      return Promise.reject(e);
    }
  }

  /*
        Get all objects of type for given ids
    */
  retrieveAll({ type, ids, transaction }: { type: string; ids: string[]; transaction?: Transaction }): Promise<any[]> {
    try {
      const multi = (transaction as RedisTransaction)?.multi || this.client.multi();
      ids.forEach((id) => multi.hGet($key(type, id), this.DATAKEY));
      if (!transaction)
        return multi.exec().then((resp: any[]) => resp.map((item: any) => (item ? JSON.parse(item) : undefined)));
      return Promise.resolve([]);
    } catch (e) {
      return Promise.reject(e);
    }
  }

  /*
        Get a type by id
    */
  retrieve({ type, id, transaction }: { type: string; id: string; transaction?: Transaction }): Promise<any> {
    try {
      if (transaction) {
        (transaction as RedisTransaction).multi.hGet($key(type, id), this.DATAKEY);
        return Promise.resolve(undefined);
      }
      return this.client.hGet($key(type, id), this.DATAKEY).then((resp) => (resp ? JSON.parse(resp) : undefined));
    } catch (e) {
      return Promise.reject(e);
    }
  }

  /*
        Get a single meta value associated with the object
    */
  getMetaValue({
    type,
    id,
    key,
    transaction,
  }: {
    type: string;
    id: string;
    key: string;
    transaction?: Transaction;
  }): Promise<string | null> {
    try {
      if (transaction) {
        (transaction as RedisTransaction).multi.hGet($key(type, id), key);
        return Promise.resolve(null);
      }
      return this.client.hGet($key(type, id), key);
    } catch (e) {
      return Promise.reject(e);
    }
  }

  /*
        Set a single meta value and associate with the object
    */
  async setMetaValue({
    type,
    id,
    key,
    value,
    transaction,
  }: {
    type: string;
    id: string;
    key: string;
    value: string | number | Buffer;
    transaction?: Transaction;
  }): Promise<void> {
    try {
      if (transaction) {
        (transaction as RedisTransaction).multi.hSet($key(type, id), key, value);
        return;
      }
      await this.client.hSet($key(type, id), key, value);
    } catch (e) {
      return Promise.reject(e);
    }
  }

  /*
        delete without initiating a claim.
        IMPORTANT! It it assumed that object has been claimed and will be released elsewhere.
        Or that we simply don't care if the delete creates a race condition
        i.e. use this if don't care if another process may be using this object
        and could 'write it back' after you delete it
    */
  async delete({ type, id, transaction }: { type: string; id: string; transaction?: Transaction }): Promise<void> {
    const multi = (transaction as RedisTransaction)?.multi || this.client.multi();
    multi.del($key(type, id));
    this.removeFromIndex(type, id, multi);
    if (!transaction) await multi.exec().then(this.checkMultiResult);
  }

  /*
        Does the type with id exist?
    */
  exists({ type, id, transaction }: { type: string; id: string; transaction?: Transaction }): Promise<boolean> {
    try {
      if (transaction) {
        (transaction as RedisTransaction).multi.exists($key(type, id));
        return Promise.resolve(false);
      }
      return this.client.exists($key(type, id)).then((resp) => !!resp);
    } catch (e) {
      return Promise.reject(e);
    }
  }

  /*
        Get a set (atomic, safe operation)
    */
  retrieveSet({
    type,
    setId,
    transaction,
  }: {
    type: string;
    setId: string;
    transaction?: Transaction;
  }): Promise<string[]> {
    if (transaction) {
      (transaction as RedisTransaction).multi.sMembers($key(type, setId));
      return Promise.resolve([]);
    }
    return this.client.sMembers($key(type, setId));
  }

  /*
        Delete a set (atomic safe, operation)
    */
  deleteSet({ type, setId, transaction }: { type: string; setId: string; transaction?: Transaction }): Promise<void> {
    return this.delete({ type, id: setId, transaction });
  }

  /*
        Is the string already in the set?
    */
  setContains({
    type,
    item,
    setId,
    transaction,
  }: {
    type: string;
    item: string;
    setId: string;
    transaction?: Transaction;
  }): Promise<boolean> {
    try {
      if (transaction) {
        (transaction as RedisTransaction).multi.sIsMember($key(type, setId), item);
        return Promise.resolve(false);
      }
      return this.client.sIsMember($key(type, setId), item).then((resp) => !!resp);
    } catch (e) {
      return Promise.reject(e);
    }
  }

  /*
        How many elements are in the set?
    */
  setCount({ type, setId, transaction }: { type: string; setId: string; transaction?: Transaction }): Promise<number> {
    try {
      if (transaction) {
        (transaction as RedisTransaction).multi.sCard($key(type, setId));
        return Promise.resolve(0);
      }
      return this.client.sCard($key(type, setId));
    } catch (e) {
      return Promise.reject(e);
    }
  }

  /*
        Add a string to a set.  Update the type set (atomic, safe operation)
    */
  async addToSet({
    type,
    item,
    setId,
    transaction,
  }: {
    type: string;
    item: string;
    setId: string;
    transaction?: Transaction;
  }): Promise<void> {
    try {
      const multi = (transaction as RedisTransaction)?.multi || this.client.multi();
      multi.sAdd($key(type, setId), item);
      this.addToIndex(type, setId, multi);
      if (!transaction) await multi.exec().then(this.checkMultiResult);
    } catch (e) {
      throw e;
    }
  }

  /*
        Remove an item from the set if found.  If it's the last item, remove the set from the type index
    */
  async removeFromSet({
    type,
    item,
    setId,
    ttl,
    transaction,
  }: {
    type: string;
    item: string;
    setId: string;
    ttl?: number;
    transaction?: Transaction;
  }): Promise<void> {
    try {
      if (transaction) {
        const multi = (transaction as RedisTransaction).multi;
        multi.sRem($key(type, setId), item);
        return;
      }
      const key = $key(type, setId);
      const multi = this.client.multi();
      multi.sRem(key, item);
      multi.sCard(key);
      const [removed, remaining] = await multi.exec().then(this.checkMultiResult);
      if (removed > 0 && remaining === 0) {
        const cleanupMulti = this.client.multi();
        this.removeFromIndex(type, setId, cleanupMulti);
        await cleanupMulti.exec().then(this.checkMultiResult);
      }
    } catch (e) {
      throw e;
    }
  }

  /*
    Retrieve all ids of a type
  */
  retrieveTypeIds(type: string, transaction?: Transaction): Promise<string[]> {
    if (transaction) {
      (transaction as RedisTransaction).multi.sMembers($indexKey(type));
      return Promise.resolve([]);
    }
    return this.client.sMembers($indexKey(type));
  }

  /*
    Count the number of items of a type
  */
  typeCount(type: string, transaction?: Transaction): Promise<number> {
    if (transaction) {
      (transaction as RedisTransaction).multi.sCard($indexKey(type));
      return Promise.resolve(0);
    }
    return this.client.sCard($indexKey(type));
  }

  /*
    Remove all keys from the database
  */
  async purgeAll(): Promise<void> {
    await this.client.flushDb();
  }

  // ****************** Manual lock operations ******************
  // ****************** Be careful with these *******************

  /*
        retrieve() with a lock
    */
  async claim({
    type,
    id,
    ttl,
    transaction,
  }: {
    type: string;
    id: string;
    ttl?: number;
    transaction?: Transaction;
  }): Promise<{ result: any; lock: Lock }> {
    const key = $key(type, id);
    const lock = await this.getLock(key, ttl);
    try {
      const result = await this.retrieve({ type, id, transaction });
      return { result, lock: { lock } };
    } catch (e) {
      await this._release(lock);
      throw e;
    }
  }

  /*
        save() with unlock
    */
  async saveAndRelease({
    lock,
    type,
    item,
    id,
    meta,
    transaction,
  }: {
    lock: Lock;
    type: string;
    item: any;
    id: string;
    meta?: Record<string, string>;
    transaction?: Transaction;
  }): Promise<void> {
    await this.save({ type, item, id, meta, transaction });
    await this._release((lock as LockWrapper).lock);
  }

  async release(lock: Lock): Promise<void> {
    await this._release(lock.lock);
  }

  async _release(lock: RLock): Promise<void> {
    await this.redlock.release(lock, { retryCount: 1 });
  }

  /*
        save() with lock
    */
  async saveAndClaim({
    type,
    item,
    id,
    ttl,
    meta,
    transaction,
  }: {
    type: string;
    item: any;
    id: string;
    ttl?: number;
    meta?: Record<string, string>;
    transaction?: Transaction;
  }): Promise<{ lock: Lock }> {
    const key = $key(type, id);
    const lock = await this.getLock(key, ttl);
    try {
      await this.save({ type, item, id, meta, transaction });
      return { lock: { lock } };
    } catch (e) {
      await this._release(lock);
      throw e;
    }
  }

  /* 
     extend the lock
    */
  async renewClaim({ lock, ttl }: { lock: Lock; ttl?: number }): Promise<void> {
    const lockTTL = ttl ? ttl : RedisStorage.defaultLockTTL;
    await (lock as LockWrapper).lock.extend(lockTTL);
  }

  /*
        obtain a lock (or use an existing one), delete, then release the lock
        use this if you want any other process using this object to release it before you delete it
    */
  async claimAndDelete({
    type,
    id,
    ttl,
    transaction,
  }: {
    type: string;
    id: string;
    ttl?: number;
    transaction?: Transaction;
  }): Promise<void> {
    const key = $key(type, id);
    const lock = await this.getLock(key, ttl);
    try {
      const multi = (transaction as RedisTransaction)?.multi || this.client.multi();
      multi.del($key(type, id));
      this.removeFromIndex(type, id, multi);
      if (!transaction) await multi.exec().then(this.checkMultiResult);
    } catch (e) {
      throw e;
    } finally {
      await lock.release();
    }
  }

  /*
        Remove an item from the set if found.  If it's the last item, remove the set from the type index
    */
  async removeFromSetWithLock({
    type,
    item,
    setId,
    ttl,
    transaction,
  }: {
    type: string;
    item: string;
    setId: string;
    ttl?: number;
    transaction?: Transaction;
  }): Promise<void> {
    try {
      const key = $key(type, setId);
      const lock = await this.getLock(key, ttl);
      if (transaction) {
        const multi = (transaction as RedisTransaction).multi;
        multi.sRem(key, item);
        await lock.release();
        return;
      }
      const multi = this.client.multi();
      multi.sRem(key, item);
      multi.sCard(key);
      const [removed, remaining] = await multi.exec().then(this.checkMultiResult);
      if (removed > 0 && remaining === 0) this.removeFromIndex(type, setId, multi);
      await multi.exec().then(this.checkMultiResult);
      await lock.release();
    } catch (e) {
      throw e;
    }
  }

  /*
    Simple key with optional expiration
  */
  async setKey({
    type,
    key,
    value,
    expSecs,
    transaction,
  }: {
    type: string;
    key: string;
    value: string;
    expSecs: number;
    transaction?: Transaction;
  }): Promise<void> {
    if (transaction) {
      const multi = (transaction as RedisTransaction).multi;
      if (!expSecs) {
        multi.set($key(type, key), JSON.stringify(value));
      } else {
        multi.setEx($key(type, key), expSecs, JSON.stringify(value));
      }
      return;
    }
    if (!expSecs) {
      await this.client.set($key(type, key), JSON.stringify(value));
    } else {
      await this.client.setEx($key(type, key), expSecs, JSON.stringify(value));
    }
  }

  /**
   * Check if a key exists and has not expired.
   * Returns true if the key exists, false otherwise.
   */
  async keyExists(type: string, key: string): Promise<boolean> {
    try {
      const exists = await this.client.exists($key(type, key));
      return exists > 0;
    } catch (e) {
      return Promise.reject(e);
    }
  }

  async getKey({ type, key, transaction }: { type: string; key: string; transaction?: Transaction }): Promise<any> {
    if (transaction) {
      (transaction as RedisTransaction).multi.get($key(type, key));
      return Promise.resolve(undefined);
    }
    return await this.client.get($key(type, key)).then((resp) => (resp ? JSON.parse(resp) : undefined));
  }

  async deleteKey({
    type,
    key,
    transaction,
  }: {
    type: string;
    key: string;
    transaction?: Transaction;
  }): Promise<number> {
    if (transaction) {
      (transaction as RedisTransaction).multi.del($key(type, key));
      return 0;
    }
    return await this.client.del($key(type, key));
  }

  private async getLock(key: string, ttl?: number): Promise<RLock> {
    try {
      return await this.redlock.acquire([$lockKey(key)], ttl || RedisStorage.defaultLockTTL);
    } catch (e) {
      //failed to get lock
      Logger.error('RedisStorage::getLock(): failed to get lock', e);
      throw e;
    }
  }

  // ****************** End manual lock operations ******************

  private addToIndex(
    type: string,
    id: string,
    client: ReturnType<RedisClientType['multi']>,
  ): ReturnType<RedisClientType['multi']> {
    client.sAdd($indexKey(type), id);
    return client;
  }

  private removeFromIndex(
    type: string,
    id: string,
    client: ReturnType<RedisClientType['multi']>,
  ): ReturnType<RedisClientType['multi']> {
    client.sRem($indexKey(type), id);
    return client;
  }

  private checkMultiResult(resp: any[] | null): Promise<any[]> {
    if (!resp) {
      return Promise.resolve([]);
    }
    // node-redis returns results directly, not as [error, result] tuples
    return Promise.resolve(resp);
  }
}

const $toLockKey = (type: string, id: string) => {
  return `LCK:${type}:${id}`;
};

const $key = (type: string, id: string): string => {
  return `${type}:${id}`;
};

const $indexKey = (type: string): string => {
  return `IDX:${type}`;
};

const $lockKey = (key: string): string => {
  return 'LCK:' + key;
};
