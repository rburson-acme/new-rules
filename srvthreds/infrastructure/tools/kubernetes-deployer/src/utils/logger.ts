/**
 * Structured logging utility
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  context?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * Logger class for structured, contextual logging
 */
export class Logger {
  private static globalLevel: LogLevel = LogLevel.INFO;
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  /**
   * Set the global log level
   */
  static setLevel(level: LogLevel): void {
    Logger.globalLevel = level;
  }

  /**
   * Log a debug message
   */
  debug(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, metadata);
  }

  /**
   * Log an info message
   */
  info(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, metadata);
  }

  /**
   * Log a warning message
   */
  warn(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, metadata);
  }

  /**
   * Log an error message
   */
  error(message: string, error?: Error, metadata?: Record<string, any>): void {
    const errorMetadata = error
      ? {
          ...metadata,
          error: {
            name: error.name,
            message: error.message,
            stack: error.stack
          }
        }
      : metadata;

    this.log(LogLevel.ERROR, message, errorMetadata);
  }

  /**
   * Log a success message (using info level with special formatting)
   */
  success(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.INFO, `✓ ${message}`, metadata);
  }

  /**
   * Log a section header (for visual grouping)
   */
  section(title: string): void {
    if (Logger.globalLevel <= LogLevel.INFO) {
      console.log('\n' + '='.repeat(60));
      console.log(title);
      console.log('='.repeat(60));
    }
  }

  /**
   * Core logging method
   */
  private log(level: LogLevel, message: string, metadata?: Record<string, any>): void {
    if (level < Logger.globalLevel) {
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      context: this.context,
      timestamp: new Date(),
      metadata
    };

    this.output(entry);
  }

  /**
   * Output the log entry (can be overridden for custom outputs)
   */
  private output(entry: LogEntry): void {
    const timestamp = entry.timestamp.toISOString();
    const levelStr = LogLevel[entry.level].padEnd(5);
    const contextStr = (entry.context || '').padEnd(20);

    const prefix = `[${timestamp}] [${levelStr}] [${contextStr}]`;
    const message = entry.message;

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(prefix, message, entry.metadata || '');
        break;
      case LogLevel.INFO:
        console.log(prefix, message);
        if (entry.metadata) {
          console.log('  ', entry.metadata);
        }
        break;
      case LogLevel.WARN:
        console.warn(prefix, message);
        if (entry.metadata) {
          console.warn('  ', entry.metadata);
        }
        break;
      case LogLevel.ERROR:
        console.error(prefix, message);
        if (entry.metadata) {
          console.error('  ', entry.metadata);
        }
        break;
    }
  }
}
