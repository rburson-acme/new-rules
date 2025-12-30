import { Storage } from '../../storage/Storage.js';

/**
 * Centralized lock management utility
 * Eliminates duplication of lock acquisition patterns across PatternsStore, ThredsStore, etc.
 */
export class LockManager {
  /**
   * Execute an operation with a lock on a single resource
   *
   * @param storage - Storage implementation providing locking
   * @param type - Resource type (e.g., Types.Pattern, Types.Thred)
   * @param id - Resource ID to lock
   * @param operation - Async operation to execute while locked
   * @param ttl - Lock time-to-live in milliseconds (default: 5000)
   * @returns Result of the operation
   */
  static async withLock<T>(
    storage: Storage,
    type: string,
    id: string,
    operation: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    const result = await storage.acquire([{ type, id }], [async () => await operation()], ttl);
    return result[0];
  }

  /**
   * Execute an operation with locks on multiple resources
   * Useful for operations that need to lock multiple related resources atomically
   *
   * @param storage - Storage implementation providing locking
   * @param resources - Array of resources to lock
   * @param operation - Async operation to execute while locked
   * @param ttl - Lock time-to-live in milliseconds
   * @returns Result of the operation
   */
  static async withLocks<T>(
    storage: Storage,
    resources: Array<{ type: string; id: string }>,
    operation: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    const result = await storage.acquire(resources, [async () => await operation()], ttl);
    return result[0];
  }

  /**
   * Execute multiple operations with a single lock
   * All operations share the same lock
   *
   * @param storage - Storage implementation
   * @param type - Resource type to lock
   * @param id - Resource ID to lock
   * @param operations - Array of async operations to execute
   * @param ttl - Lock time-to-live in milliseconds
   * @returns Array of results from each operation
   */
  static async withLockMultiOp<T>(
    storage: Storage,
    type: string,
    id: string,
    operations: Array<() => Promise<T>>,
    ttl?: number,
  ): Promise<T[]> {
    return storage.acquire([{ type, id }], operations, ttl);
  }
}
