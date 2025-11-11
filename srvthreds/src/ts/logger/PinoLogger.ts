import pino from 'pino';
import { levelNameMap, LogArgs, LoggerDelegate, LoggerLevel, LogObj, LogSignature } from '../thredlib/lib/Logger.js';

export class PinoLogger implements LoggerDelegate {
  private pinoInstance: pino.Logger;

  constructor() {
    const levelName = process.env.LOG_LEVEL || 'info';
    const isProduction = process.env.NODE_ENV === 'production';

    const transport = pino.transport(
      isProduction
        ? {
            // In production, use OpenTelemetry transport
            target: 'pino-opentelemetry-transport',
          }
        : {
            // In development, use pino-pretty
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'HH:MM:ss Z',
              ignore: 'pid,hostname',
            },
          },
    );

    this.pinoInstance = pino(
      {
        level: levelName,
      },
      transport,
    );
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

  private formatArgs(args: LogArgs, errorOrObject?: Error | any): LogArgs {
    if (errorOrObject && typeof args === 'string') {
      if (errorOrObject instanceof Error) {
        return { msg: args, err: errorOrObject };
      }
      return { msg: args, obj: errorOrObject };
    }
    return args;
  }
}
