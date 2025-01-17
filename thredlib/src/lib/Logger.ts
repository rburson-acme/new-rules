
export enum LoggerLevel {
  NONE,
  ERROR,
  WARN,
  INFO,
  DEBUG,
  TRACE,
}
export class Logger {
  public static debug = (...args: Array<any>) => {};
  public static logObject = (...args: Array<any>) => {};
  public static info = (...args: Array<any>) => {};
  public static warn = (...args: Array<any>) => {};
  // should always be enabled
  public static error = (...args: Array<any>) => console.error(...args);
  public static trace = (...args: Array<any>) => {};

  public static setLevel(loggerLevel: LoggerLevel) {
    Logger.debug = (...args: Array<any>) => {};
    Logger.logObject = (...args: Array<any>) => {};
    Logger.info = (...args: Array<any>) => {};
    Logger.warn = (...args: Array<any>) => {};
    Logger.error = (...args: Array<any>) => {};
    Logger.trace = (...args: Array<any>) => {};

    if (loggerLevel >= LoggerLevel.TRACE) Logger.trace = (...args) => console.trace(...args);
    if (loggerLevel >= LoggerLevel.DEBUG) Logger.debug = (...args) => console.debug(...args);
    if (loggerLevel >= LoggerLevel.INFO) Logger.info = (...args) => console.info(...args);
    if (loggerLevel >= LoggerLevel.WARN) Logger.warn = (...args) => console.warn(...args);
    if (loggerLevel >= LoggerLevel.ERROR) Logger.error = (...args) => console.error(...args);
    if (loggerLevel >= LoggerLevel.DEBUG)
      Logger.logObject = (...args) => {
        if (args?.length) {
          if (args.length === 1) {
            console.dir(args[0], { depth: null, colors: true });
          } else {
            console.debug(args[0]);
            console.dir(args[1], { depth: null, colors: true });
          }
        }
      };
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
