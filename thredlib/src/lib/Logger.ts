
export enum LoggerLevel { NONE, ERROR, WARN, INFO, DEBUG, TRACE }
export class Logger {
    public static debug = (...args: Array<any>) => {};
    public static error = (...args: Array<any>) => console.error(...args);
    public static info = (...args: Array<any>) => {};
    public static warn = (...args: Array<any>) => {};
    public static trace = (...args: Array<any>) => {};

    public static setLevel(loggerLevel: LoggerLevel) {
    
        Logger.debug = (...args: Array<any>) => {};
        Logger.error = (...args: Array<any>) => {};
        Logger.info = (...args: Array<any>) => {};
        Logger.warn = (...args: Array<any>) => {};
        Logger.trace = (...args: Array<any>) => {};
        
        if(loggerLevel >= LoggerLevel.ERROR) Logger.error = (...args)  => console.error(...args);
        if(loggerLevel >= LoggerLevel.TRACE) Logger.trace = (...args)  => console.log(...args);
        if(loggerLevel >= LoggerLevel.DEBUG) Logger.debug = (...args) => console.debug(...args);
        if(loggerLevel >= LoggerLevel.INFO) Logger.info = (...args) => console.info(...args);
        if(loggerLevel >= LoggerLevel.WARN) Logger.warn = (...args) => console.warn(...args);
    }
}