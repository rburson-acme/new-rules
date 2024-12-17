export declare enum LoggerLevel {
    NONE = 0,
    ERROR = 1,
    WARN = 2,
    INFO = 3,
    DEBUG = 4,
    TRACE = 5
}
export declare class Logger {
    static debug: (...args: Array<any>) => void;
    static error: (...args: Array<any>) => void;
    static info: (...args: Array<any>) => void;
    static warn: (...args: Array<any>) => void;
    static trace: (...args: Array<any>) => void;
    static setLevel(loggerLevel: LoggerLevel): void;
}
