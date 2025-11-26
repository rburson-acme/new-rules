/**
 * Tests for Logger utility
 *
 * Tests the Logger wrapper that delegates to thredlib's Logger.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ContextLogger as Logger, LogLevel } from '../../../shared/logger.js';
import { Logger as ThredLogger } from 'thredlib';

describe('Logger', () => {
  let logger: Logger;
  let thredLoggerSpy: any;

  beforeEach(() => {
    // Set log level to DEBUG for tests
    Logger.setLevel(LogLevel.DEBUG);
    logger = new Logger('TestContext');

    // Spy on thredlib's Logger static methods
    thredLoggerSpy = {
      debug: vi.spyOn(ThredLogger, 'debug').mockImplementation(() => {}),
      info: vi.spyOn(ThredLogger, 'info').mockImplementation(() => {}),
      warn: vi.spyOn(ThredLogger, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(ThredLogger, 'error').mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('debug', () => {
    it('should log debug messages', () => {
      logger.debug('test debug message');
      expect(thredLoggerSpy.debug).toHaveBeenCalled();
    });

    it('should include context prefix', () => {
      logger.debug('test debug message');
      expect(thredLoggerSpy.debug).toHaveBeenCalledWith('[TestContext] test debug message');
    });

    it('should include metadata', () => {
      logger.debug('test message', { key: 'value' });
      expect(thredLoggerSpy.debug).toHaveBeenCalledWith({
        message: '[TestContext] test message',
        obj: { key: 'value' },
      });
    });
  });

  describe('info', () => {
    it('should log info messages', () => {
      logger.info('test info message');
      expect(thredLoggerSpy.info).toHaveBeenCalled();
    });

    it('should include context prefix', () => {
      logger.info('test info message');
      expect(thredLoggerSpy.info).toHaveBeenCalledWith('[TestContext] test info message');
    });
  });

  describe('warn', () => {
    it('should log warning messages', () => {
      logger.warn('test warning');
      expect(thredLoggerSpy.warn).toHaveBeenCalled();
    });

    it('should include context prefix', () => {
      logger.warn('test warning');
      expect(thredLoggerSpy.warn).toHaveBeenCalledWith('[TestContext] test warning');
    });
  });

  describe('error', () => {
    it('should log error messages', () => {
      const error = new Error('test error');
      logger.error('error occurred', error);
      expect(thredLoggerSpy.error).toHaveBeenCalled();
    });

    it('should include error in log call', () => {
      const error = new Error('test error');
      logger.error('error occurred', error);
      expect(thredLoggerSpy.error).toHaveBeenCalledWith({
        message: '[TestContext] error occurred',
        err: error,
        obj: undefined,
      });
    });

    it('should include error and metadata', () => {
      const error = new Error('test error');
      logger.error('error occurred', error, { context: 'test' });
      expect(thredLoggerSpy.error).toHaveBeenCalledWith({
        message: '[TestContext] error occurred',
        err: error,
        obj: { context: 'test' },
      });
    });
  });

  describe('success', () => {
    it('should log success messages with checkmark', () => {
      logger.success('operation succeeded');
      expect(thredLoggerSpy.info).toHaveBeenCalledWith('[TestContext] ✓ operation succeeded');
    });
  });

  describe('section', () => {
    it('should log section headers using h1 formatting', () => {
      logger.section('Test Section');
      expect(thredLoggerSpy.info).toHaveBeenCalled();
      // The call includes h1 formatted string
      const call = thredLoggerSpy.info.mock.calls[0][0];
      expect(call).toContain('Test Section');
    });
  });

  describe('log levels', () => {
    it('should respect global log level - suppress debug when ERROR level', () => {
      Logger.setLevel(LogLevel.ERROR);
      const newLogger = new Logger('Test');

      // Clear previous calls
      thredLoggerSpy.debug.mockClear();
      thredLoggerSpy.error.mockClear();

      newLogger.debug('should not appear');
      // Debug should not be called because level is ERROR
      expect(thredLoggerSpy.debug).not.toHaveBeenCalled();

      newLogger.error('should appear', new Error('test'));
      expect(thredLoggerSpy.error).toHaveBeenCalled();

      // Reset for other tests
      Logger.setLevel(LogLevel.DEBUG);
    });
  });
});
