export declare enum LoggerLevel {
    ERROR = 0,
    WARN = 1,
    INFO = 2,
    DEBUG = 3,
    TRACE = 4
}
export declare class Logger {
    static debug: (...args: Array<any>) => void;
    static error: (...args: Array<any>) => void;
    static info: (...args: Array<any>) => void;
    static warn: (...args: Array<any>) => void;
    static trace: (...args: Array<any>) => void;
    static setLevel(loggerLevel: LoggerLevel): void;
}
