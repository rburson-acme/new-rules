import Redis, { ChainableCommander } from 'ioredis';
import Redlock, { Lock as RLock } from 'redlock';
import { Logger, Series, StringMap, Timers } from '../thredlib/index.js';
import { Lock, Storage, indexId } from './Storage.js';

interface LockWrapper extends Lock {
  lock: RLock;
}

export class RedisStorage implements Storage {
  // Locks will expire based on this value by default, if not specified explictly during operations
  // However, they should always be released explicity
  private static defaultLockTTL = 5000;

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

  private client: Redis;
  private redlock: Redlock;

  //@TODO - set up sentinel or clustering

  constructor() {
    this.client = new Redis({
      // This is the default value of `retryStrategy`
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });
    this.client.on('error', function (error) {
      Logger.error(error);
    });
    this.client.on('ready', function () {
      /* Logger.info('Ready'); */
    });
    this.client.on('reconnecting', function () {
      Logger.info('Reconnecting...');
    });
    this.client.on('end', function () {});
    /*
        Adjust retryCount and retry delay upwards if too many clients are failing to aquire the same locked object
    */
    this.redlock = new Redlock([this.client], RedisStorage.redlockDefaults);
    this.redlock.on('clientError', function (err) {
      Logger.error(err);
    });
  }

  /*
        Disconnect from Redis
    */
  async disconnect(): Promise<void> {
    await this.client.quit();
  }

  async aquire(resources: { type: string; id: string }[], ops: (() => Promise<any>)[], ttl?: number): Promise<any[]> {
    return this.redlock.using(
      resources.map(({ type, id }) => $toLockKey(type, id)),
      ttl || RedisStorage.defaultLockTTL,
      async (signal) => {
        const results = await Series.map(ops, (op) => {
          if (signal.aborted) {
            Logger.error('Aquire operation aborted!');
            throw signal.error;
          }
          return op();
        });
        return results;
      },
    );
  }


  /*
        Save and add the id to the type index
    */
  async save(type: string, item: any, id: string): Promise<void> {
    // Logger.info(`Saving ${type} as ${JSON.stringify(item)}`);
    try {
      const multi = this.client.multi();
      const data = JSON.stringify(item);
      multi.set($key(type, id), data);
      this.addToIndex(type, id, multi);
      await multi.exec().then(this.checkMultiResult);
    } catch (e) {
      return Promise.reject(e);
    }
  }

  /*
        Get all objects of type
    */
  retrieveAll(type: string, ids: string[]): Promise<any[]> {
    const targets = ids.map((id) => $key(type, id));
    try {
      return this.client
        .mget(...targets)
        .then((resp) => resp.map((jsonStr) => (jsonStr ? JSON.parse(jsonStr) : undefined)));
    } catch (e) {
      return Promise.reject(e);
    }
  }

  /*
        Get a type by id
    */
  retrieve(type: string, id: string): Promise<any> {
    // Logger.info(`Retrieving ${type}:${id}`);
    try {
      return this.client.get($key(type, id)).then((resp) => (resp ? JSON.parse(resp) : undefined));
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
  async delete(type: string, id: string): Promise<void> {
    // Logger.info(`Saving ${type} as ${JSON.stringify(item)}`);
    const multi = this.client.multi();
    multi.del($key(type, id));
    this.removeFromIndex(type, id, multi);
    await multi.exec().then(this.checkMultiResult);
  }

  /*
        Get a set (atomic, safe operation)
    */
  retrieveSet(type: string, setId: string): Promise<string[]> {
    return this.client.smembers($key(type, setId));
  }

  /*
        Delete a set (atomic safe, operation)
    */
  deleteSet(type: string, setId: string): Promise<void> {
    return this.delete(type, setId);
  }

  /*
        Does the type with id exist?
    */
  exists(type: string, id: string): Promise<boolean> {
    try {
      return this.client.exists($key(type, id)).then((resp) => !!resp);
    } catch (e) {
      return Promise.reject(e);
    }
  }

  /*
        Is the string already in the set?
    */
  setContains(type: string, item: string, setId: string): Promise<boolean> {
    try {
      return this.client.sismember($key(type, setId), item).then((resp) => !!resp);
    } catch (e) {
      return Promise.reject(e);
    }
  }

  /*
        How many elements are in the set?
    */
  setCount(type: string, setId: string): Promise<number> {
    try {
      return this.client.scard($key(type, setId));
    } catch (e) {
      return Promise.reject(e);
    }
  }

  /*
        Add a string to a set.  Update the type index (atomic, safe operation)
    */
  async addToSet(type: string, item: string, setId: string): Promise<void> {
    try {
      const multi = this.client.multi();
      multi.sadd($key(type, setId), item);
      this.addToIndex(type, setId, multi);
      await multi.exec().then(this.checkMultiResult);
    } catch (e) {
      throw e;
    }
  }

  /*
        Remove an item from the set if found.  If it's the last item, remove the set from the type index
    */
  async removeFromSet(type: string, item: string, setId: string, ttl?: number): Promise<void> {
    try {
      const key = $key(type, setId);
      const multi = this.client.multi();
      multi.srem(key, item);
      multi.scard(key);
      const [removed, remaining] = await multi.exec().then(this.checkMultiResult);
      if (removed > 0 && remaining === 0) this.removeFromIndex(type, setId, multi);
      await multi.exec().then(this.checkMultiResult);
    } catch (e) {
      throw e;
    }
  }
 
  /*
    Remove all keys from the database
  */
  async purgeAll(): Promise<void> {
    await this.client.flushdb();
  }


  // ****************** Manual lock operations ******************
  // ****************** Be careful with these *******************

  /*
        retrieve() with a lock
    */
  async claim(type: string, id: string, ttl?: number): Promise<{ result: any; lock: Lock }> {
    const key = $key(type, id);
    const lock = await this.getLock(key, ttl);
    try {
      const result = await this.retrieve(type, id);
      return { result, lock: { lock } };
    } catch (e) {
      await this._release(lock);
      throw e;
    }
  }

  /*
        save() with unlock
    */
  async saveAndRelease(lock: LockWrapper, type: string, item: any, id: string): Promise<void> {
    const key = $key(type, id);
    await this.save(type, item, id);
    await this._release(lock.lock);
  }

  async release(lock: Lock): Promise<void> {
      this._release(lock.lock);
  }
 
 async _release(lock: RLock): Promise<void> {
    await this.redlock.release(lock, { retryCount: 1 });
  }

  /*
        save() with lock
    */
  async saveAndClaim(type: string, item: any, id: string, ttl?: number): Promise<{ lock: Lock }> {
    const key = $key(type, id);
    const lock = await this.getLock(key, ttl);
    try {
      await this.save(type, item, id);
      return { lock: { lock }};
    } catch (e) {
      await this._release(lock);
      throw e;
    }
  }

  /* 
     extend the lock
    */
  async renewClaim(lock: LockWrapper, ttl?: number): Promise<void> {
    const lockTTL = ttl ? ttl : RedisStorage.defaultLockTTL;
    await lock.lock.extend(lockTTL);
  }

  /*
        obtain a lock (or use an existing one), delete, then release the lock
        use this if you want any other process using this object to release it before you delete it
    */
  async claimAndDelete(type: string, id: string, ttl?: number): Promise<void> {
    // Logger.info(`Saving ${type} as ${JSON.stringify(item)}`);
    const key = $key(type, id);
    const lock = await this.getLock(key, ttl);
    try {
      const multi = this.client.multi();
      multi.del($key(type, id));
      this.removeFromIndex(type, id, multi);
      await multi.exec().then(this.checkMultiResult);
    } catch (e) {
      //unlock if failure
      throw e;
    } finally {
      await lock.release();
    }
  }

  /*
        Remove an item from the set if found.  If it's the last item, remove the set from the type index
    */
  async removeFromSetWithLock(type: string, item: string, setId: string, ttl?: number): Promise<void> {
    try {
      const key = $key(type, setId);
      const lock = await this.getLock(key, ttl);
      const multi = this.client.multi();
      multi.srem(key, item);
      multi.scard(key);
      const [removed, remaining] = await multi.exec().then(this.checkMultiResult);
      if (removed > 0 && remaining === 0) this.removeFromIndex(type, setId, multi);
      await multi.exec().then(this.checkMultiResult);
      await lock.release();
    } catch (e) {
      throw e;
    }
  }

  private async getLock(key: string, ttl?: number): Promise<RLock> {
    try {
      return await this.redlock.acquire([$lockKey(key)], ttl || RedisStorage.defaultLockTTL);
    } catch (e) {
      //failed to get lock
      Logger.error(e);
      throw e;
    }
  }
  
  // ****************** End manual lock operations ******************



  private addToIndex(type: string, id: string, client: ChainableCommander): ChainableCommander {
    this.client.sadd($key(type, indexId), id);
    return client;
  }

  private removeFromIndex(type: string, id: string, client: ChainableCommander): ChainableCommander {
    this.client.srem($key(type, indexId), id);
    return client;
  }

  private checkMultiResult(resp: [error: Error | null, result: unknown][] | null): Promise<any[]> {
    const results = [];
    if (resp) {
      for (let i = 0; i < resp.length; i++) {
        if (resp[i][0]) {
          return Promise.reject(resp[i][0]);
        }
        results[i] = resp[i][1];
      }
    }
    return Promise.resolve(results);
  }
}

const $toLockKey = (type: string, id: string) => {
  return `LCK:${type}:${id}`;
};

const $key = (type: string, id: string): string => {
  return `${type}:${id}`;
};

const $lockKey = (key: string): string => {
  return 'LCK:' + key;
};
