import { ConsoleLogger } from './ConsoleLogger.js';

export enum LoggerLevel {
  NONE,
  ERROR,
  WARN,
  INFO,
  DEBUG,
  TRACE,
}

export interface LogObj {
  msg?: string;
  err?: Error;
  obj?: any;
  thredId?: string;
}

export type LogArgs = string | Error | LogObj;

// supported log signatures
export interface LogSignature {
  (arg: LogArgs): void;
  (message: string, errorOrObject: Error | any): void;
}

export interface LoggerDelegate {
  debug: LogSignature;
  info: LogSignature;
  warn: LogSignature;
  error: LogSignature;
  trace: LogSignature;
  logObject: (args: any) => void;
  setLevel: (loggerLevel: LoggerLevel) => void;
}

export const levelNameMap: Record<LoggerLevel, string> = {
  [LoggerLevel.NONE]: 'silent',
  [LoggerLevel.ERROR]: 'error',
  [LoggerLevel.WARN]: 'warn',
  [LoggerLevel.INFO]: 'info',
  [LoggerLevel.DEBUG]: 'debug',
  [LoggerLevel.TRACE]: 'trace',
};

export const nameLevelMap: Record<string, LoggerLevel> = {
  silent: LoggerLevel.NONE,
  error: LoggerLevel.ERROR,
  warn: LoggerLevel.WARN,
  info: LoggerLevel.INFO,
  debug: LoggerLevel.DEBUG,
  trace: LoggerLevel.TRACE,
};

export class Logger {
  // default to console logger
  static loggerDelegate: LoggerDelegate = new ConsoleLogger();

  private static delegateLog(logFn: LogSignature, args: LogArgs, error?: Error): void {
    if (error && typeof args === 'string') {
      logFn(args, error);
    } else {
      logFn(args);
    }
  }

  public static debug: LogSignature = (args: LogArgs, errorOrObject?: Error) => {
    Logger.delegateLog(Logger.loggerDelegate.debug.bind(Logger.loggerDelegate), args, errorOrObject);
  };

  public static info: LogSignature = (args: LogArgs, errorOrObject?: Error | any) => {
    Logger.delegateLog(Logger.loggerDelegate.info.bind(Logger.loggerDelegate), args, errorOrObject);
  };

  public static warn: LogSignature = (args: LogArgs, errorOrObject?: Error | any) => {
    Logger.delegateLog(Logger.loggerDelegate.warn.bind(Logger.loggerDelegate), args, errorOrObject);
  };

  public static error: LogSignature = (args: LogArgs, errorOrObject?: Error | any) => {
    Logger.delegateLog(Logger.loggerDelegate.error.bind(Logger.loggerDelegate), args, errorOrObject);
  };

  public static trace: LogSignature = (args: LogArgs, errorOrObject?: Error | any) => {
    Logger.delegateLog(Logger.loggerDelegate.trace.bind(Logger.loggerDelegate), args, errorOrObject);
  };

  public static logObject: (args: any) => void = (args: any) => {
    Logger.loggerDelegate.logObject(args);
  };

  public static setLevel(loggerLevel: LoggerLevel) {
    Logger.loggerDelegate.setLevel(loggerLevel);
  }

  static h1(message: string): string {
    return `
 ___  ___  ___  ___  ___  ___  ___  ___  ___  ___  ___  ___  ___
(___)(___)(___)(___)(___)(___)(___)(___)(___)(___)(___)(___)(___)

${message}
 ___  ___  ___  ___  ___  ___  ___  ___  ___  ___  ___  ___  ___
(___)(___)(___)(___)(___)(___)(___)(___)(___)(___)(___)(___)(___)
`;
  }

  static h2(message: string): string {
    return `
${message}
___  ___  ___  ___  ___  ___  ___  ___  ___  ___  ___  ___  ___ ___
`;
  }

  static crit(message: string): string {
    return `
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

${message}

!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
`;
  }
}
