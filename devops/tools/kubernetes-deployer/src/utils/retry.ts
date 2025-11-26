/**
 * Retry logic with exponential backoff
 */

import { ContextLogger as Logger } from '../../../shared/logger.js';

export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  delay?: number; // Alias for initialDelayMs
  backoff?: number; // Alias for backoffMultiplier
  onRetry?: (error: Error, attempt: number) => void;
}

const DEFAULT_OPTIONS = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  delay: 1000,
  backoff: 2,
  onRetry: () => {}
};

/**
 * Retry an async operation with exponential backoff
 */
export async function retry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  // Support both initialDelayMs/delay and backoffMultiplier/backoff
  const normalizedOptions = {
    ...options,
    initialDelayMs: options.initialDelayMs ?? options.delay ?? DEFAULT_OPTIONS.initialDelayMs,
    backoffMultiplier: options.backoffMultiplier ?? options.backoff ?? DEFAULT_OPTIONS.backoffMultiplier,
  };
  const opts = { ...DEFAULT_OPTIONS, ...normalizedOptions };
  const logger = new Logger('Retry');

  let lastError: Error;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;

      if (attempt === opts.maxAttempts) {
        logger.error(`Operation failed after ${opts.maxAttempts} attempts`, error);
        throw error;
      }

      const delay = Math.min(
        opts.initialDelayMs * Math.pow(opts.backoffMultiplier, attempt - 1),
        opts.maxDelayMs
      );

      logger.warn(`Attempt ${attempt}/${opts.maxAttempts} failed, retrying in ${delay}ms...`, {
        error: error.message
      });

      opts.onRetry(error, attempt);

      await sleep(delay);
    }
  }

  throw lastError!;
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry with custom condition
 */
export async function retryUntil<T>(
  operation: () => Promise<T>,
  condition: (result: T) => boolean,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const logger = new Logger('RetryUntil');

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      const result = await operation();

      if (condition(result)) {
        return result;
      }

      if (attempt === opts.maxAttempts) {
        throw new Error(`Condition not met after ${opts.maxAttempts} attempts`);
      }

      const delay = Math.min(
        opts.initialDelayMs * Math.pow(opts.backoffMultiplier, attempt - 1),
        opts.maxDelayMs
      );

      logger.debug(`Condition not met (attempt ${attempt}/${opts.maxAttempts}), retrying in ${delay}ms...`);

      await sleep(delay);
    } catch (error: any) {
      logger.error(`Operation failed on attempt ${attempt}`, error);

      if (attempt === opts.maxAttempts) {
        throw error;
      }

      const delay = Math.min(
        opts.initialDelayMs * Math.pow(opts.backoffMultiplier, attempt - 1),
        opts.maxDelayMs
      );

      await sleep(delay);
    }
  }

  throw new Error(`Condition not met after ${opts.maxAttempts} attempts`);
}
