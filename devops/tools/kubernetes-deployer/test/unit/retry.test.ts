/**
 * Tests for Retry utility
 */

import { describe, it, expect, vi } from 'vitest';
import { retry, retryUntil, sleep } from '../../src/utils/retry.js';

describe('Retry', () => {
  describe('retry', () => {
    it('should succeed on first attempt', async () => {
      const operation = vi.fn().mockResolvedValue('success');

      const result = await retry(operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockResolvedValue('success');

      const result = await retry(operation, { maxAttempts: 3, delay: 10 });

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should throw after max attempts', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('persistent failure'));

      await expect(
        retry(operation, { maxAttempts: 2, delay: 10 })
      ).rejects.toThrow('persistent failure');

      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should use exponential backoff', async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockResolvedValue('success');

      const start = Date.now();
      await retry(operation, {
        maxAttempts: 3,
        delay: 50,
        backoff: 2,
      });
      const duration = Date.now() - start;

      // Should have delays of ~50ms and ~100ms = ~150ms total
      expect(duration).toBeGreaterThanOrEqual(100);
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should call onRetry callback', async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockResolvedValue('success');

      const onRetry = vi.fn();

      await retry(operation, {
        maxAttempts: 3,
        delay: 10,
        onRetry,
      });

      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onRetry).toHaveBeenCalledWith(expect.any(Error), 1);
    });
  });

  describe('retryUntil', () => {
    it('should return when condition is met', async () => {
      let counter = 0;
      const operation = vi.fn().mockImplementation(() => {
        counter++;
        return Promise.resolve(counter);
      });

      const condition = (result: number) => result >= 3;

      const result = await retryUntil(operation, condition, {
        maxAttempts: 5,
        delay: 10,
      });

      expect(result).toBe(3);
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should throw if condition not met within max attempts', async () => {
      const operation = vi.fn().mockResolvedValue(1);
      const condition = (result: number) => result >= 10;

      await expect(
        retryUntil(operation, condition, { maxAttempts: 3, delay: 10 })
      ).rejects.toThrow('Condition not met after 3 attempts');

      expect(operation).toHaveBeenCalledTimes(3);
    });
  });

  describe('sleep', () => {
    it('should sleep for specified duration', async () => {
      const start = Date.now();
      await sleep(100);
      const duration = Date.now() - start;

      expect(duration).toBeGreaterThanOrEqual(95); // Allow small margin
      expect(duration).toBeLessThan(150);
    });
  });
});
