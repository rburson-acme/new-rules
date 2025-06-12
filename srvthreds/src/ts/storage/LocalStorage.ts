import fs from 'fs';
import { Logger, remove, addUnique, addUniqueById, removeById, Identifiable, Parallel } from '../thredlib/index.js';
import { Lock, Storage } from './Storage.js';

// @TODO - if this is ever needed, a small change is required regarding 'locking'
// All methods should 'sync' operations (readFileSync, writeFileSync, etc)
// Currently only the lock related methods do this

const indexId = 'IDX';

export class LocalStorage implements Storage {
  reconnect(): Promise<void> {
    return Promise.resolve();
  }

  disconnect(): Promise<void> {
    return Promise.resolve();
  }

  aquire(resources: { type: string; id: string }[], ops: (() => Promise<any>)[], ttl?: number): Promise<any[]> {
    throw new Error('Method not implemented');
  }

  purgeAll(): Promise<void> {
    throw new Error('Method not implemented');
  }

  getMetaValue(type: string, id: string, key: string): Promise<string | null> {
    throw new Error('Method not implemented');
  }

  setMetaValue(type: string, id: string, key: string, value: string | number | Buffer): Promise<void> {
    throw new Error('Method not implemented');
  }

  /*
     retrieve() with a lock
     this is a local mock implementation that does not lock objects
     With a RemoteStorage implementation, objects could be locked and we'd be notified when they are released
    */
  claim(type: string, id: string): Promise<any> {
    try {
      const data = fs.readFileSync(`tmp/${type}_${id}.json`);
      const item = JSON.parse(data.toString());
      return Promise.resolve(item);
    } catch (e) {
      Logger.debug(`LocalStorage:claim():  ${type} ${id} not found`);
      return Promise.resolve(undefined);
    }

    // For remote impl
    /*
        const item = await this.retrieve(type, id);
        if(!item.lock) {
            const lockedItem = { ...item, lock: Date.now() }
            await this.save(type, lockedItem);
            return lockedItem;
        }
        */
  }

  /*
     save() with unlock
     this is a local mock implementation that does not lock objects
     With a RemoteStorage implementation, objects could be locked and we'd be notified when they are released
    */
  saveAndRelease(lock: Lock, type: string, item: any, id: string, meta?: Record<string, string>): Promise<void> {
    if (meta) throw new Error('Meta not yet implemented');
    try {
      const data = JSON.stringify(item);
      fs.writeFileSync(`tmp/${type}_${id}.json`, data);
      return this.addToIndex(type, id);
    } catch (e) {
      return Promise.reject(e);
    }
    // For remote impl
    /*
        return this.save(type, { ...item, lock: undefined });
        */
  }

  /*
     save() with lock
     this is a local mock implementation that does not lock objects
     With a RemoteStorage implementation, objects could be locked and we'd be notified when they are released
    */
  saveAndClaim(type: string, item: any, id: string, ttl?: number, meta?: Record<string, string>): Promise<Lock> {
    if (meta) throw new Error('Meta not yet implemented');
    try {
      const data = JSON.stringify(item);
      fs.writeFileSync(`tmp/${type}_${id}.json`, data);
      return this.addToIndex(type, id).then(() => item);
    } catch (e) {
      return Promise.reject(e);
    }
    // For remote impl
    /*
        return this.save(type, { ...item, lock: Date.now() });
        */
  }

  async renewClaim(lock: Lock, ttl?: number): Promise<void> {
    return undefined;
  }

  release(lock: Lock): Promise<void> {
    throw new Error('Method not implemented');
  }

  save(type: string, item: any, id: string, meta?: Record<string, string>): Promise<void> {
    // Logger.info(`Saving ${type} as ${JSON.stringify(item)}`);
    if (meta) throw new Error('Meta not yet implemented');
    return new Promise((resolve, reject) => {
      try {
        const data = JSON.stringify(item);
        fs.writeFile(`tmp/${type}_${id}.json`, data, (err) => {
          if (err) {
            reject(err);
          } else {
            this.addToIndex(type, id).then(resolve).catch(reject);
          }
        });
      } catch (e) {
        reject(e);
      }
    });
  }

  retrieveAll(type: string, ids: string[]): Promise<any[]> {
    return Parallel.map(ids, (id) => this.retrieve(type, id));
  }

  retrieve(type: string, id: string): Promise<any> {
    // Logger.info(`Retrieving ${type}:${id}`);
    return new Promise((resolve, reject) => {
      fs.readFile(`tmp/${type}_${id}.json`, (error, data) => {
        if (error) {
          Logger.debug(`LocalStorage:retrieve():  ${type} ${id} not found`);
          resolve(undefined);
        } else {
          try {
            resolve(JSON.parse(data.toString()));
          } catch (e) {
            reject(e);
          }
        }
      });
    });
  }

  delete(type: string, id: string): Promise<void> {
    try {
      const path = `tmp/${type}_${id}.json`;
      if (fs.existsSync(path)) {
        fs.unlinkSync(path);
      }
      return this.removeFromIndex(type, id);
    } catch (e) {
      return Promise.reject(e);
    }
  }

  claimAndDelete(type: string, id: string, ttl?: number): Promise<void> {
    return this.delete(type, id);
  }

  exists(type: string, id: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        this.retrieve(type, id)
          .then((item) => resolve(!!item))
          .catch(reject);
      } catch (e) {
        reject(e);
      }
    });
  }

  setContains(type: string, item: string, setId: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        this.retrieveSet(type, setId)
          .then((set) => {
            resolve(set?.includes(item));
          })
          .catch(reject);
      } catch (e) {
        reject(e);
      }
    });
  }

  setCount(type: string, setId: string): Promise<number> {
    return new Promise((resolve, reject) => {
      try {
        this.retrieveSet(type, setId)
          .then((set) => {
            resolve(set?.length);
          })
          .catch(reject);
      } catch (e) {
        reject(e);
      }
    });
  }

  retrieveSet(type: string, setId: string): Promise<string[]> {
    return this.retrieve(type, setId);
  }

  deleteSet(type: string, setId: string): Promise<void> {
    return this.delete(type, setId);
  }

  async addToSet(type: string, item: string, setId: string): Promise<void> {
    let set: any[] = await this.claim(type, setId);
    if (!set) {
      set = [];
      await this.saveAndClaim(type, set, setId);
    }
    addUniqueById(set, item);
    return this.saveAndRelease({ lock: null }, type, set, setId);
  }

  async removeFromSet(type: string, item: string, setId: string): Promise<void> {
    let set: any[] = await this.claim(type, setId);
    if (!set) {
      return Promise.resolve(undefined);
    }
    set = removeById(set, item);
    if (set.length) {
      return this.saveAndRelease({ lock: null }, type, set, setId);
    } else {
      return this.delete(type, setId);
    }
  }

  async removeFromSetWithLock(type: string, item: string, setId: string): Promise<void> {
    throw new Error('Method not implemented');
  }

  /*
    Retrieve all ids of a type
  */
  async retrieveTypeIds(type: string): Promise<string[]> {
    return this.retrieveSet(type, indexId);
  }

  /*
    Count the number of items of a type
  */
  async typeCount(type: string): Promise<number> {
    return this.setCount(type, indexId);
  }

  private addToIndex(type: string, id: string): Promise<void> {
    //we don't want to create an index for our 'index' type
    return id !== indexId ? this.addToSet(type, id, indexId) : Promise.resolve();
  }

  private removeFromIndex(type: string, id: string): Promise<void> {
    //we don't want to remove an index for our 'index' type
    return id !== indexId ? this.removeFromSet(type, id, indexId) : Promise.resolve();
  }
}
