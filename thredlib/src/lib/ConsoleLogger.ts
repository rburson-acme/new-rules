import { LogArgs, LoggerDelegate, LoggerLevel, LogObj, LogSignature, nameLevelMap } from './Logger.js';

export class ConsoleLogger implements LoggerDelegate {
  debug: LogSignature = (args: LogArgs, error?: Error) => {};
  info: LogSignature = (args: LogArgs, error?: Error) => {};
  warn: LogSignature = (args: LogArgs, error?: Error) => {};
  // should always be enabled
  error: LogSignature = (args: LogArgs, error?: Error) => (error ? console.error(args, error) : console.error(args));
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

    this.assignLogger(loggerLevel, LoggerLevel.TRACE, 'trace', console.trace.bind(console));
    this.assignLogger(loggerLevel, LoggerLevel.DEBUG, 'debug', console.debug.bind(console));
    this.assignLogger(loggerLevel, LoggerLevel.INFO, 'info', console.info.bind(console));
    this.assignLogger(loggerLevel, LoggerLevel.WARN, 'warn', console.warn.bind(console));
    this.assignLogger(loggerLevel, LoggerLevel.ERROR, 'error', console.error.bind(console));
    if (loggerLevel >= LoggerLevel.DEBUG)
      this.logObject = (args: any) => console.dir(args, { depth: null, colors: true });
  }

  h1(message: string): string {
    return `
 ___  ___  ___  ___  ___  ___  ___  ___  ___  ___  ___  ___  ___
(___)(___)(___)(___)(___)(___)(___)(___)(___)(___)(___)(___)(___)

${message}
 ___  ___  ___  ___  ___  ___  ___  ___  ___  ___  ___  ___  ___
(___)(___)(___)(___)(___)(___)(___)(___)(___)(___)(___)(___)(___)
`;
  }

  h2(message: string): string {
    return `
${message}
___  ___  ___  ___  ___  ___  ___  ___  ___  ___  ___  ___  ___ ___
`;
  }

  crit(message: string): string {
    return `
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

${message}

!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
`;
  }

  private assignLogger(
    currentLevel: LoggerLevel,
    requiredLevel: LoggerLevel,
    loggerName: keyof Pick<ConsoleLogger, 'trace' | 'debug' | 'info' | 'warn' | 'error'>,
    consoleFn: (args: LogArgs, error?: Error) => void,
  ) {
    if (currentLevel >= requiredLevel) {
      this[loggerName] = (args: LogArgs, error?: Error) => {
        if (error) {
          consoleFn(args, error);
        } else if (typeof args === 'object') {
          consoleFn(args as LogObj);
        }
      };
    }
  }
}
