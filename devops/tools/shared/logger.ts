/**
 * Shared logging utilities for devops CLIs
 *
 * Wraps thredlib's Logger for consistency across the monorepo.
 * Re-exports thredlib's Logger types and provides convenience methods.
 */

import { Logger, LoggerLevel } from 'thredlib';

// Re-export thredlib's types for convenience
export { Logger, LoggerLevel };

/**
 * LogLevel enum for backwards compatibility with existing code.
 * Maps to thredlib's LoggerLevel.
 */
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

/**
 * Map LogLevel to thredlib's LoggerLevel
 */
function toLoggerLevel(level: LogLevel): LoggerLevel {
  switch (level) {
    case LogLevel.DEBUG:
      return LoggerLevel.DEBUG;
    case LogLevel.INFO:
      return LoggerLevel.INFO;
    case LogLevel.WARN:
      return LoggerLevel.WARN;
    case LogLevel.ERROR:
      return LoggerLevel.ERROR;
    default:
      return LoggerLevel.INFO;
  }
}

/**
 * DevOps logger wrapper around thredlib's Logger.
 *
 * Provides additional convenience methods for CLI output:
 * - section() for visual grouping
 * - success() / failure() for status indicators
 */
class DevOpsLogger {
  /**
   * Set the global log level
   */
  setLevel(level: LogLevel): void {
    Logger.setLevel(toLoggerLevel(level));
  }

  /**
   * Log a debug message
   */
  debug(message: string, context?: string, data?: any): void {
    if (data) {
      Logger.debug({ message: context ? `[${context}] ${message}` : message, obj: data });
    } else {
      Logger.debug(context ? `[${context}] ${message}` : message);
    }
  }

  /**
   * Log an info message
   */
  info(message: string, context?: string, data?: any): void {
    if (data) {
      Logger.info({ message: context ? `[${context}] ${message}` : message, obj: data });
    } else {
      Logger.info(context ? `[${context}] ${message}` : message);
    }
  }

  /**
   * Log a warning message
   */
  warn(message: string, context?: string, data?: any): void {
    if (data) {
      Logger.warn({ message: context ? `[${context}] ${message}` : message, obj: data });
    } else {
      Logger.warn(context ? `[${context}] ${message}` : message);
    }
  }

  /**
   * Log an error message
   */
  error(message: string, context?: string, data?: any): void {
    if (data instanceof Error) {
      Logger.error({ message: context ? `[${context}] ${message}` : message, err: data });
    } else if (data) {
      Logger.error({ message: context ? `[${context}] ${message}` : message, obj: data });
    } else {
      Logger.error(context ? `[${context}] ${message}` : message);
    }
  }

  /**
   * Log a section header for visual grouping in CLI output
   */
  section(title: string): void {
    Logger.info(Logger.h1(title));
  }

  /**
   * Log a success message with checkmark
   */
  success(message: string, context?: string): void {
    Logger.info(context ? `[${context}] ✓ ${message}` : `✓ ${message}`);
  }

  /**
   * Log a failure message with X mark
   */
  failure(message: string, context?: string): void {
    Logger.error(context ? `[${context}] ✗ ${message}` : `✗ ${message}`);
  }
}

/**
 * Singleton logger instance for use across devops tools
 */
export const logger = new DevOpsLogger();

/**
 * Context-aware logger that prefixes all messages with a context string.
 * Use this when you want consistent context prefixing without passing context to each call.
 *
 * Replaces kubernetes-deployer's internal Logger class.
 */
export class ContextLogger {
  private static globalLevel: LogLevel = LogLevel.INFO;
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  /**
   * Set the global log level for all ContextLogger instances
   */
  static setLevel(level: LogLevel): void {
    ContextLogger.globalLevel = level;
    logger.setLevel(level);
  }

  debug(message: string, metadata?: Record<string, unknown>): void {
    if (ContextLogger.globalLevel === LogLevel.DEBUG) {
      logger.debug(message, this.context, metadata);
    }
  }

  info(message: string, metadata?: Record<string, unknown>): void {
    logger.info(message, this.context, metadata);
  }

  warn(message: string, metadata?: Record<string, unknown>): void {
    logger.warn(message, this.context, metadata);
  }

  error(message: string, error?: Error, metadata?: Record<string, unknown>): void {
    if (error) {
      Logger.error({ message: `[${this.context}] ${message}`, err: error, obj: metadata });
    } else {
      logger.error(message, this.context, metadata);
    }
  }

  success(message: string, metadata?: Record<string, unknown>): void {
    this.info(`✓ ${message}`, metadata);
  }

  section(title: string): void {
    Logger.info(Logger.h1(`[${this.context}] ${title}`));
  }
}

/**
 * Create a context-aware logger instance
 */
export function createLogger(context: string): ContextLogger {
  return new ContextLogger(context);
}
