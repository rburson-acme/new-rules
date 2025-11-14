export declare enum LoggerLevel {
    NONE = 0,
    ERROR = 1,
    WARN = 2,
    INFO = 3,
    DEBUG = 4,
    TRACE = 5
}
export interface LogObj {
    msg?: string;
    err?: Error;
    obj?: any;
    thredId?: string;
}
export type LogArgs = string | Error | LogObj;
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
    h1(message: string): string;
    h2(message: string): string;
    crit(message: string): string;
}
export declare const levelNameMap: Record<LoggerLevel, string>;
export declare const nameLevelMap: Record<string, LoggerLevel>;
export declare class Logger {
    static loggerDelegate: LoggerDelegate;
    private static delegateLog;
    static debug: LogSignature;
    static info: LogSignature;
    static warn: LogSignature;
    static error: LogSignature;
    static trace: LogSignature;
    static logObject: (args: any) => void;
    static setLevel(loggerLevel: LoggerLevel): void;
    static h1(message: string): string;
    static h2(message: string): string;
    static crit(message: string): string;
}
