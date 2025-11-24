import { LogArgs, LoggerDelegate, LoggerLevel, LogSignature } from './Logger.js';
export declare class ConsoleLogger implements LoggerDelegate {
    debug: LogSignature;
    info: LogSignature;
    warn: LogSignature;
    error: LogSignature;
    trace: LogSignature;
    logObject: (args: LogArgs) => void;
    constructor();
    setLevel(loggerLevel: LoggerLevel): void;
    h1(message: string): string;
    h2(message: string): string;
    crit(message: string): string;
    private assignLogger;
}
