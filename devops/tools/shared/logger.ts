/**
 * Shared logging utilities for devops CLIs
 *
 * Uses console directly for CLI output. thredlib's Logger is designed for
 * server-side structured logging and doesn't output plain strings properly.
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

// Track current log level
let currentLogLevel: LogLevel = LogLevel.INFO;

/**
 * Check if a message at the given level should be logged
 */
function shouldLog(level: LogLevel): boolean {
  const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
  return levels.indexOf(level) >= levels.indexOf(currentLogLevel);
}

/**
 * DevOps logger for CLI output.
 *
 * Provides convenience methods for CLI output:
 * - section() for visual grouping
 * - success() / failure() for status indicators
 */
class DevOpsLogger {
  /**
   * Set the global log level
   */
  setLevel(level: LogLevel): void {
    currentLogLevel = level;
  }

  /**
   * Log a debug message
   */
  debug(message: string, context?: string, data?: any): void {
    if (!shouldLog(LogLevel.DEBUG)) return;
    const formatted = context ? `[${context}] ${message}` : message;
    if (data) {
      console.debug(formatted, data);
    } else {
      console.debug(formatted);
    }
  }

  /**
   * Log an info message
   */
  info(message: string, context?: string, data?: any): void {
    if (!shouldLog(LogLevel.INFO)) return;
    const formatted = context ? `[${context}] ${message}` : message;
    if (data) {
      console.log(formatted, data);
    } else {
      console.log(formatted);
    }
  }

  /**
   * Log a warning message
   */
  warn(message: string, context?: string, data?: any): void {
    if (!shouldLog(LogLevel.WARN)) return;
    const formatted = context ? `[${context}] ${message}` : message;
    if (data) {
      console.warn(formatted, data);
    } else {
      console.warn(formatted);
    }
  }

  /**
   * Log an error message
   */
  error(message: string, context?: string, data?: any): void {
    if (!shouldLog(LogLevel.ERROR)) return;
    const formatted = context ? `[${context}] ${message}` : message;
    if (data) {
      console.error(formatted, data);
    } else {
      console.error(formatted);
    }
  }

  /**
   * Log a section header for visual grouping in CLI output
   */
  section(title: string): void {
    if (!shouldLog(LogLevel.INFO)) return;
    console.log(`
╔════════════════════════════════════════════════════════════════╗
║  ${title.padEnd(60)}  ║
╚════════════════════════════════════════════════════════════════╝`);
  }

  /**
   * Log a success message with checkmark
   */
  success(message: string, context?: string): void {
    if (!shouldLog(LogLevel.INFO)) return;
    const formatted = context ? `[${context}] ✓ ${message}` : `✓ ${message}`;
    console.log(formatted);
  }

  /**
   * Log a failure message with X mark
   */
  failure(message: string, context?: string): void {
    if (!shouldLog(LogLevel.ERROR)) return;
    const formatted = context ? `[${context}] ✗ ${message}` : `✗ ${message}`;
    console.error(formatted);
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
      const formatted = `[${this.context}] ${message}`;
      if (metadata) {
        console.error(formatted, error, metadata);
      } else {
        console.error(formatted, error);
      }
    } else {
      logger.error(message, this.context, metadata);
    }
  }

  success(message: string, metadata?: Record<string, unknown>): void {
    this.info(`✓ ${message}`, metadata);
  }

  section(title: string): void {
    logger.section(`[${this.context}] ${title}`);
  }
}

/**
 * Create a context-aware logger instance
 */
export function createLogger(context: string): ContextLogger {
  return new ContextLogger(context);
}
