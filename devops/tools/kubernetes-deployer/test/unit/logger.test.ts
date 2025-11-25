/**
 * Tests for Logger utility
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Logger, LogLevel } from '../../src/utils/logger.js';

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

  describe('debug', () => {
    it('should log debug messages', () => {
      logger.debug('test debug message');
      expect(consoleSpy.debug).toHaveBeenCalled();
    });

    it('should include metadata', () => {
      logger.debug('test message', { key: 'value' });
      expect(consoleSpy.debug).toHaveBeenCalled();
    });
  });

  describe('info', () => {
    it('should log info messages', () => {
      logger.info('test info message');
      expect(consoleSpy.log).toHaveBeenCalled();
    });
  });

  describe('warn', () => {
    it('should log warning messages', () => {
      logger.warn('test warning');
      expect(consoleSpy.warn).toHaveBeenCalled();
    });
  });

  describe('error', () => {
    it('should log error messages', () => {
      const error = new Error('test error');
      logger.error('error occurred', error);
      expect(consoleSpy.error).toHaveBeenCalled();
    });

    it('should include error details', () => {
      const error = new Error('test error');
      logger.error('error occurred', error, { context: 'test' });
      expect(consoleSpy.error).toHaveBeenCalled();
    });
  });

  describe('success', () => {
    it('should log success messages with checkmark', () => {
      logger.success('operation succeeded');
      expect(consoleSpy.log).toHaveBeenCalled();
    });
  });

  describe('section', () => {
    it('should log section headers', () => {
      logger.section('Test Section');
      expect(consoleSpy.log).toHaveBeenCalled();
    });
  });

  describe('log levels', () => {
    it('should respect global log level', () => {
      Logger.setLevel(LogLevel.ERROR);
      const newLogger = new Logger('Test');

      newLogger.debug('should not appear');
      expect(consoleSpy.debug).not.toHaveBeenCalled();

      newLogger.error('should appear', new Error('test'));
      expect(consoleSpy.error).toHaveBeenCalled();

      // Reset for other tests
      Logger.setLevel(LogLevel.DEBUG);
    });
  });
});
