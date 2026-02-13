import { Transaction } from './Transaction.js';

export interface Storage {
  /*
      acquire() with a lock on the given resources which is released after the ops are completed
  */
  acquire(args: {
    resources: { type: string; id: string }[];
    ops: (() => Promise<any>)[];
    ttl?: number;
  }): Promise<any[]>;
  newTransaction(): Transaction;

  save(args: { type: string; item: any; id: string; meta?: Record<string, string> }): Promise<void>;
  retrieveAll(args: { type: string; ids: string[] }): Promise<any[]>;
  retrieve(args: { type: string; id: string }): Promise<any>;
  getMetaValue(args: { type: string; id: string; key: string }): Promise<string | null>;
  setMetaValue(args: { type: string; id: string; key: string; value: string | number | Buffer }): Promise<void>;
  delete(args: { type: string; id: string }): Promise<void>;
  retrieveSet(args: { type: string; setId: string }): Promise<string[]>;
  deleteSet(args: { type: string; setId: string }): Promise<void>;
  exists(args: { type: string; id: string }): Promise<boolean>;
  setContains(args: { type: string; item: string; setId: string }): Promise<boolean>;
  setCount(args: { type: string; setId: string }): Promise<number>;
  addToSet(args: { type: string; item: string; setId: string }): Promise<void>;
  removeFromSet(args: { type: string; item: string; setId: string; ttl?: number }): Promise<void>;
  retrieveTypeIds(type: string): Promise<string[]>;
  typeCount(type: string): Promise<number>;
  disconnect(): Promise<void>;
  purgeAll(): Promise<void>;

  /*
     retrieve() with a lock
    */
  claim(args: { type: string; id: string; ttl?: number }): Promise<{ result: any; lock: Lock }>;
  renewClaim(args: { lock: Lock; ttl?: number }): Promise<void>;
  /*
     save() with unlock
    */
  saveAndRelease(args: {
    lock: Lock;
    type: string;
    item: any;
    id: string;
    meta?: Record<string, string>;
  }): Promise<void>;

  release(lock: Lock): Promise<void>;
  /*
     save() with lock
    */
  saveAndClaim(args: {
    type: string;
    item: any;
    id: string;
    ttl?: number;
    meta?: Record<string, string>;
  }): Promise<{ lock: Lock }>;
  claimAndDelete(args: { type: string; id: string; ttl?: number }): Promise<void>;
  /*
     extend the lock
    */
  removeFromSetWithLock(args: { type: string; item: string; setId: string; ttl?: number }): Promise<void>;

  setKey(args: { type: string; key: string; value: string; expSecs: number }): Promise<void>;
  getKey(args: { type: string; key: string }): Promise<any>;
  deleteKey(args: { type: string; key: string }): Promise<number>;
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
  RefreshTokens: 'RefreshTokens',
  Utility: 'U',
};

export const UtilityKeys = {
  UnboundReaction: 'UnboundReaction',
};
