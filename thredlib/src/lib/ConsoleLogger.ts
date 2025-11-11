import { LogArgs, LoggerDelegate, LoggerLevel, LogObj, LogSignature, nameLevelMap } from './Logger.js';

export class ConsoleLogger implements LoggerDelegate {
  debug: LogSignature = (args: LogArgs, error?: Error) => {};
  info: LogSignature = (args: LogArgs, error?: Error) => {};
  warn: LogSignature = (args: LogArgs, error?: Error) => {};
  // should always be enabled
  error: LogSignature = (args: LogArgs, error?: Error) => error ? console.error(args, error) : console.error(args);
  trace: LogSignature = (args: LogArgs, error?: Error) => {};
  logObject = (args: LogArgs) => {};

  constructor() {
    const levelName = process.env.LOG_LEVEL || 'info';
    this.setLevel(nameLevelMap[levelName]);
  }

  public setLevel(loggerLevel: LoggerLevel) {
    //reset all to no-ops
    this.debug = (args: LogArgs, error?: Error) => {};
    this.info = (args: LogArgs, error?: Error) => {};
    this.warn = (args: LogArgs, error?: Error) => {};
    this.error = (args: LogArgs, error?: Error) => {};
    this.trace = (args: LogArgs, error?: Error) => {};
    this.logObject = (args: any) => {};

    if (loggerLevel >= LoggerLevel.TRACE) this.trace = (args, error?: Error) => error ? console.trace(args, error) : console.trace(args);
    if (loggerLevel >= LoggerLevel.DEBUG) this.debug = (args, error?: Error) => error ? console.debug(args, error) : console.debug(args);
    if (loggerLevel >= LoggerLevel.INFO) this.info = (args, error?: Error) => error ? console.info(args, error) : console.info(args);
    if (loggerLevel >= LoggerLevel.WARN) this.warn = (args, error?: Error) => error ? console.warn(args, error) : console.warn(args);
    if (loggerLevel >= LoggerLevel.ERROR) this.error = (args, error?: Error) => error ? console.error(args, error) : console.error(args);
    if (loggerLevel >= LoggerLevel.DEBUG) this.logObject = (args: any) => console.dir(args, { depth: null, colors: true });
  }
}
