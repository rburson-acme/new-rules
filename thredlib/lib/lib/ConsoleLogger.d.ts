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
}
