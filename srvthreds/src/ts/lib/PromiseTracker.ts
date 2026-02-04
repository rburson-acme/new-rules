import { Logger } from '../thredlib/index.js';

export interface PromiseTrackerOptions {
  /** Default timeout for drain in milliseconds (default: 30000) */
  defaultDrainTimeout?: number;
  /** Logger prefix for log messages (default: 'PromiseTracker') */
  logPrefix?: string;
}

/**
 * Tracks in-flight promises and provides graceful drain/shutdown capabilities.
 *
 * Usage:
 * ```typescript
 * const tracker = new PromiseTracker();
 *
 * // Track promises as they're created
 * tracker.track(someAsyncOperation());
 *
 * // On shutdown, drain all in-flight promises
 * tracker.startDrain();
 * await tracker.drain();
 * ```
 */
export class PromiseTracker {
  private inFlight: Set<Promise<unknown>> = new Set();
  private _isDraining: boolean = false;
  private readonly defaultDrainTimeout: number;
  private readonly logPrefix: string;

  constructor(options: PromiseTrackerOptions = {}) {
    this.defaultDrainTimeout = options.defaultDrainTimeout ?? 30000;
    this.logPrefix = options.logPrefix ?? 'PromiseTracker';
  }

  /**
   * Track a promise. Automatically removes from tracking when it settles.
   * Returns the same promise for chaining.
   *
   * If draining has started, the promise is still tracked (to ensure we wait for it)
   * but callers should check `isDraining` before starting new work.
   */
  track<T>(promise: Promise<T>): Promise<T> {
    this.inFlight.add(promise);
    promise.finally(() => {
      this.inFlight.delete(promise);
    });
    return promise;
  }

  /**
   * Returns true if drain has been initiated.
   * Callers should check this before starting new work.
   */
  get isDraining(): boolean {
    return this._isDraining;
  }

  /**
   * Signal that draining should begin.
   * New work should not be started after this is called.
   */
  startDrain(): void {
    this._isDraining = true;
  }

  /**
   * Reset the draining state (e.g., if shutdown was cancelled).
   */
  cancelDrain(): void {
    this._isDraining = false;
  }

  /**
   * Wait for all tracked promises to settle.
   *
   * @param timeout - Maximum time to wait in ms (uses defaultDrainTimeout if not specified)
   * @returns Object indicating success and count of promises that didn't complete
   */
  async drain(timeout?: number): Promise<{ complete: boolean; remaining: number }> {
    const drainTimeout = timeout ?? this.defaultDrainTimeout;

    if (this.inFlight.size === 0) {
      return { complete: true, remaining: 0 };
    }

    Logger.info({
      message: `${this.logPrefix}::drain - waiting for ${this.inFlight.size} in-flight promises (timeout: ${drainTimeout}ms)`,
    });

    const drainPromise = Promise.allSettled([...this.inFlight]);
    const timeoutPromise = new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), drainTimeout));

    const result = await Promise.race([drainPromise, timeoutPromise]);

    if (result === 'timeout') {
      Logger.warn({
        message: `${this.logPrefix}::drain - timeout after ${drainTimeout}ms, ${this.inFlight.size} promises still in-flight`,
      });
      return { complete: false, remaining: this.inFlight.size };
    }

    Logger.info({
      message: `${this.logPrefix}::drain - all promises drained successfully`,
    });
    return { complete: true, remaining: 0 };
  }

  /**
   * Convenience method: start drain and wait for completion.
   */
  async startAndDrain(timeout?: number): Promise<{ complete: boolean; remaining: number }> {
    this.startDrain();
    return this.drain(timeout);
  }

  /**
   * Number of currently tracked in-flight promises.
   */
  get count(): number {
    return this.inFlight.size;
  }

  /**
   * Returns true if no promises are currently in-flight.
   */
  get isEmpty(): boolean {
    return this.inFlight.size === 0;
  }

  /**
   * Clear all tracked promises without waiting.
   * Use with caution - typically only for testing or forced shutdown.
   */
  clear(): void {
    this.inFlight.clear();
    this._isDraining = false;
  }
}
