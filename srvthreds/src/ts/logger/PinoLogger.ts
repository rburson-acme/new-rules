import pino from 'pino';
import { levelNameMap, LogArgs, LoggerDelegate, LoggerLevel, LogSignature } from '../thredlib/lib/Logger.js';

export class PinoLogger implements LoggerDelegate {
  private pinoInstance: pino.Logger;

  constructor() {
    const levelName = process.env.LOG_LEVEL || 'info';
    const isProduction = process.env.NODE_ENV === 'production';

    if (isProduction) {
      // In production, use Azure Monitor compatible JSON output to stdout
      this.pinoInstance = pino({
        level: levelName,
        formatters: {
          level: (label) => {
            return { severity: this.mapLevelToSeverity(label) };
          },
        },
        timestamp: pino.stdTimeFunctions.isoTime,
        messageKey: 'message', // Azure Monitor expects 'message' field
        base: null, // Remove default fields like pid and hostname
      });
    } else {
      // In development, use pino-pretty
      const transport = pino.transport({
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      });

      this.pinoInstance = pino(
        {
          level: levelName,
        },
        transport,
      );
    }
  }

  public debug: LogSignature = (args: LogArgs, errorOrObject?: Error | any) =>
    this.pinoInstance.debug(this.formatArgs(args, errorOrObject));
  public info: LogSignature = (args: LogArgs, errorOrObject?: Error | any) =>
    this.pinoInstance.info(this.formatArgs(args, errorOrObject));
  public warn: LogSignature = (args: LogArgs, errorOrObject?: Error | any) =>
    this.pinoInstance.warn(this.formatArgs(args, errorOrObject));
  public error: LogSignature = (args: LogArgs, errorOrObject?: Error | any) =>
    this.pinoInstance.error(this.formatArgs(args, errorOrObject));
  public trace: LogSignature = (args: LogArgs, errorOrObject?: Error | any) =>
    this.pinoInstance.trace(this.formatArgs(args, errorOrObject));
  public logObject = (args: any) => {
    this.pinoInstance.debug(args);
  };

  /**
   * Set the logging level. This determines which log methods are active.
   * @param loggerLevel - The desired logging level
   */
  public setLevel(loggerLevel: LoggerLevel): void {
    this.pinoInstance.level = levelNameMap[loggerLevel];
  }

  h1(message: string): string {
    return `${message}`;
  }

  h2(message: string): string {
    return `${message}`;
  }

  crit(message: string): string {
    return `${message}`;
  }

  private formatArgs(args: LogArgs, errorOrObject?: Error | any): LogArgs {
    if (errorOrObject && typeof args === 'string') {
      if (errorOrObject instanceof Error) {
        return { message: args, err: errorOrObject };
      }
      return { message: args, obj: errorOrObject };
    }
    return args;
  }

  /**
   * Map Pino log levels to Azure Monitor severity numbers
   * @param level - Pino level name
   * @returns Azure Monitor severity number (0-4)
   */
  private mapLevelToSeverity(level: string): number {
    const severityMap: Record<string, number> = {
      trace: 0, // Verbose
      debug: 1, // Information
      info: 2, // Information
      warn: 3, // Warning
      error: 4, // Error
      fatal: 4, // Critical/Error
    };
    return severityMap[level] ?? 2;
  }
}
