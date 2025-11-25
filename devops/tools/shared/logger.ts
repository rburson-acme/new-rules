/**
 * Shared logging utilities for infrastructure CLIs
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: string;
  data?: any;
}

class Logger {
  private logs: LogEntry[] = [];
  private minLevel: LogLevel = LogLevel.INFO;

  constructor(minLevel: LogLevel = LogLevel.INFO) {
    this.minLevel = minLevel;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    return levels.indexOf(level) >= levels.indexOf(this.minLevel);
  }

  private formatMessage(level: LogLevel, message: string, context?: string): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` [${context}]` : '';
    return `${timestamp} ${level}${contextStr}: ${message}`;
  }

  private getColorCode(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG:
        return '\x1b[36m'; // Cyan
      case LogLevel.INFO:
        return '\x1b[32m'; // Green
      case LogLevel.WARN:
        return '\x1b[33m'; // Yellow
      case LogLevel.ERROR:
        return '\x1b[31m'; // Red
    }
  }

  private resetColor(): string {
    return '\x1b[0m';
  }

  debug(message: string, context?: string, data?: any): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      const formatted = this.formatMessage(LogLevel.DEBUG, message, context);
      console.debug(`${this.getColorCode(LogLevel.DEBUG)}${formatted}${this.resetColor()}`, data || '');
      this.logs.push({ level: LogLevel.DEBUG, message, timestamp: new Date().toISOString(), context, data });
    }
  }

  info(message: string, context?: string, data?: any): void {
    if (this.shouldLog(LogLevel.INFO)) {
      const formatted = this.formatMessage(LogLevel.INFO, message, context);
      console.log(`${this.getColorCode(LogLevel.INFO)}${formatted}${this.resetColor()}`, data || '');
      this.logs.push({ level: LogLevel.INFO, message, timestamp: new Date().toISOString(), context, data });
    }
  }

  warn(message: string, context?: string, data?: any): void {
    if (this.shouldLog(LogLevel.WARN)) {
      const formatted = this.formatMessage(LogLevel.WARN, message, context);
      console.warn(`${this.getColorCode(LogLevel.WARN)}${formatted}${this.resetColor()}`, data || '');
      this.logs.push({ level: LogLevel.WARN, message, timestamp: new Date().toISOString(), context, data });
    }
  }

  error(message: string, context?: string, data?: any): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      const formatted = this.formatMessage(LogLevel.ERROR, message, context);
      console.error(`${this.getColorCode(LogLevel.ERROR)}${formatted}${this.resetColor()}`, data || '');
      this.logs.push({ level: LogLevel.ERROR, message, timestamp: new Date().toISOString(), context, data });
    }
  }

  section(title: string): void {
    const line = '═'.repeat(60);
    console.log(`\n${this.getColorCode(LogLevel.INFO)}${line}${this.resetColor()}`);
    console.log(`${this.getColorCode(LogLevel.INFO)}  ${title}${this.resetColor()}`);
    console.log(`${this.getColorCode(LogLevel.INFO)}${line}${this.resetColor()}\n`);
  }

  success(message: string, context?: string): void {
    const formatted = `✅ ${message}`;
    console.log(`${this.getColorCode(LogLevel.INFO)}${formatted}${this.resetColor()}`);
    this.logs.push({ level: LogLevel.INFO, message: formatted, timestamp: new Date().toISOString(), context });
  }

  failure(message: string, context?: string): void {
    const formatted = `❌ ${message}`;
    console.error(`${this.getColorCode(LogLevel.ERROR)}${formatted}${this.resetColor()}`);
    this.logs.push({ level: LogLevel.ERROR, message: formatted, timestamp: new Date().toISOString(), context });
  }

  getLogs(): LogEntry[] {
    return this.logs;
  }

  setMinLevel(level: LogLevel): void {
    this.minLevel = level;
  }
}

export const logger = new Logger();

