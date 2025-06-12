export interface Storage {
  /*
      aquire() with a lock on the given resources which is released after the ops are completed
  */
  aquire(resources: { type: string; id: string }[], ops: (() => Promise<any>)[], ttl?: number): Promise<any[]>;

  save(type: string, item: any, id: string, meta?: Record<string, string>): Promise<void>;
  retrieveAll(type: string, ids: string[]): Promise<any[]>;
  retrieve(type: string, id: string): Promise<any>;
  getMetaValue(type: string, id: string, key: string): Promise<string | null>;
  setMetaValue(type: string, id: string, key: string, value: string | number | Buffer): Promise<void>;
  delete(type: string, id: string): Promise<void>;
  retrieveSet(type: string, setId: string): Promise<string[]>;
  deleteSet(type: string, setId: string): Promise<void>;
  exists(type: string, id: string): Promise<boolean>;
  setContains(type: string, item: string, setId: string): Promise<boolean>;
  setCount(type: string, setId: string): Promise<number>;
  addToSet(type: string, item: string, setId: string): Promise<void>;
  removeFromSet(type: string, item: string, setId: string, ttl?: number): Promise<void>;
  retrieveTypeIds(type: string): Promise<string[]>;
  typeCount(type: string): Promise<number>;
  disconnect(): Promise<void>;
  purgeAll(): Promise<void>;

  /*
     retrieve() with a lock
    */
  claim(type: string, id: string, ttl?: number): Promise<{ result: any; lock: Lock }>;
  renewClaim(lock: Lock, ttl?: number): Promise<void>;
  /*
     save() with unlock
    */
  saveAndRelease(lock: Lock, type: string, item: any, id: string, meta?: Record<string, string>): Promise<void>;

  release(lock: Lock): Promise<void>;
  /*
     save() with lock
    */
  saveAndClaim(
    type: string,
    item: any,
    id: string,
    ttl?: number,
    meta?: Record<string, string>,
  ): Promise<{ lock: Lock }>;
  claimAndDelete(type: string, id: string, ttl?: number): Promise<void>;
  /* 
     extend the lock
    */
  removeFromSetWithLock(type: string, item: string, setId: string, ttl?: number): Promise<void>;
}

export interface Lock {
  lock: any;
}

export const Types = {
  Thred: 'Thred',
  Pattern: 'Pattern',
  Event: 'Event',
  SessionParticipant: 'SessionParticipant',
  ParticipantSessions: 'ParticipantSession',
  ParticipantThreds: 'ParticipantThreds',
};
