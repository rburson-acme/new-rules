import { ConsoleLogger } from './ConsoleLogger.js';
export var LoggerLevel;
(function (LoggerLevel) {
    LoggerLevel[LoggerLevel["NONE"] = 0] = "NONE";
    LoggerLevel[LoggerLevel["ERROR"] = 1] = "ERROR";
    LoggerLevel[LoggerLevel["WARN"] = 2] = "WARN";
    LoggerLevel[LoggerLevel["INFO"] = 3] = "INFO";
    LoggerLevel[LoggerLevel["DEBUG"] = 4] = "DEBUG";
    LoggerLevel[LoggerLevel["TRACE"] = 5] = "TRACE";
})(LoggerLevel || (LoggerLevel = {}));
export const levelNameMap = {
    [LoggerLevel.NONE]: 'silent',
    [LoggerLevel.ERROR]: 'error',
    [LoggerLevel.WARN]: 'warn',
    [LoggerLevel.INFO]: 'info',
    [LoggerLevel.DEBUG]: 'debug',
    [LoggerLevel.TRACE]: 'trace',
};
export const nameLevelMap = {
    silent: LoggerLevel.NONE,
    error: LoggerLevel.ERROR,
    warn: LoggerLevel.WARN,
    info: LoggerLevel.INFO,
    debug: LoggerLevel.DEBUG,
    trace: LoggerLevel.TRACE,
};
export class Logger {
    // default to console logger
    static loggerDelegate = new ConsoleLogger();
    static delegateLog(logFn, args, error) {
        if (error && typeof args === 'string') {
            logFn(args, error);
        }
        else {
            logFn(args);
        }
    }
    static debug = (args, errorOrObject) => {
        Logger.delegateLog(Logger.loggerDelegate.debug.bind(Logger.loggerDelegate), args, errorOrObject);
    };
    static info = (args, errorOrObject) => {
        Logger.delegateLog(Logger.loggerDelegate.info.bind(Logger.loggerDelegate), args, errorOrObject);
    };
    static warn = (args, errorOrObject) => {
        Logger.delegateLog(Logger.loggerDelegate.warn.bind(Logger.loggerDelegate), args, errorOrObject);
    };
    static error = (args, errorOrObject) => {
        Logger.delegateLog(Logger.loggerDelegate.error.bind(Logger.loggerDelegate), args, errorOrObject);
    };
    static trace = (args, errorOrObject) => {
        Logger.delegateLog(Logger.loggerDelegate.trace.bind(Logger.loggerDelegate), args, errorOrObject);
    };
    static logObject = (args) => {
        Logger.loggerDelegate.logObject(args);
    };
    static setLevel(loggerLevel) {
        Logger.loggerDelegate.setLevel(loggerLevel);
    }
    static h1(message) {
        return `
 ___  ___  ___  ___  ___  ___  ___  ___  ___  ___  ___  ___  ___
(___)(___)(___)(___)(___)(___)(___)(___)(___)(___)(___)(___)(___)

${message}
 ___  ___  ___  ___  ___  ___  ___  ___  ___  ___  ___  ___  ___
(___)(___)(___)(___)(___)(___)(___)(___)(___)(___)(___)(___)(___)
`;
    }
    static h2(message) {
        return `
${message}
___  ___  ___  ___  ___  ___  ___  ___  ___  ___  ___  ___  ___ ___
`;
    }
    static crit(message) {
        return `
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

${message}

!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
`;
    }
}
