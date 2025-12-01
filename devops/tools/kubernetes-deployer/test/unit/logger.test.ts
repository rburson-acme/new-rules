/**
 * Tests for Logger utility
 *
 * Tests the ContextLogger that uses console for CLI output.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ContextLogger as Logger, LogLevel } from '../../../shared/logger.js';

describe('Logger', () => {
  let logger: Logger;
  let consoleSpy: any;

  beforeEach(() => {
    // Set log level to DEBUG for tests
    Logger.setLevel(LogLevel.DEBUG);
    logger = new Logger('TestContext');

    // Spy on console methods
    consoleSpy = {
      debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('debug', () => {
    it('should log debug messages', () => {
      logger.debug('test debug message');
      expect(consoleSpy.debug).toHaveBeenCalled();
    });

    it('should include context prefix', () => {
      logger.debug('test debug message');
      expect(consoleSpy.debug).toHaveBeenCalledWith('[TestContext] test debug message');
    });

    it('should include metadata', () => {
      logger.debug('test message', { key: 'value' });
      expect(consoleSpy.debug).toHaveBeenCalledWith('[TestContext] test message', { key: 'value' });
    });
  });

  describe('info', () => {
    it('should log info messages', () => {
      logger.info('test info message');
      expect(consoleSpy.log).toHaveBeenCalled();
    });

    it('should include context prefix', () => {
      logger.info('test info message');
      expect(consoleSpy.log).toHaveBeenCalledWith('[TestContext] test info message');
    });
  });

  describe('warn', () => {
    it('should log warning messages', () => {
      logger.warn('test warning');
      expect(consoleSpy.warn).toHaveBeenCalled();
    });

    it('should include context prefix', () => {
      logger.warn('test warning');
      expect(consoleSpy.warn).toHaveBeenCalledWith('[TestContext] test warning');
    });
  });

  describe('error', () => {
    it('should log error messages', () => {
      const error = new Error('test error');
      logger.error('error occurred', error);
      expect(consoleSpy.error).toHaveBeenCalled();
    });

    it('should include error in log call', () => {
      const error = new Error('test error');
      logger.error('error occurred', error);
      expect(consoleSpy.error).toHaveBeenCalledWith('[TestContext] error occurred', error);
    });

    it('should include error and metadata', () => {
      const error = new Error('test error');
      logger.error('error occurred', error, { context: 'test' });
      expect(consoleSpy.error).toHaveBeenCalledWith('[TestContext] error occurred', error, { context: 'test' });
    });
  });

  describe('success', () => {
    it('should log success messages with checkmark', () => {
      logger.success('operation succeeded');
      expect(consoleSpy.log).toHaveBeenCalledWith('[TestContext] ✓ operation succeeded');
    });
  });

  describe('section', () => {
    it('should log section headers', () => {
      logger.section('Test Section');
      expect(consoleSpy.log).toHaveBeenCalled();
      // The call includes the section title
      const call = consoleSpy.log.mock.calls[0][0];
      expect(call).toContain('Test Section');
    });
  });

  describe('log levels', () => {
    it('should respect global log level - suppress debug when ERROR level', () => {
      Logger.setLevel(LogLevel.ERROR);
      const newLogger = new Logger('Test');

      // Clear previous calls
      consoleSpy.debug.mockClear();
      consoleSpy.error.mockClear();

      newLogger.debug('should not appear');
      // Debug should not be called because level is ERROR
      expect(consoleSpy.debug).not.toHaveBeenCalled();

      newLogger.error('should appear', new Error('test'));
      expect(consoleSpy.error).toHaveBeenCalled();

      // Reset for other tests
      Logger.setLevel(LogLevel.DEBUG);
    });
  });
});
