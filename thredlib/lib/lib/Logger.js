export var LoggerLevel;
(function (LoggerLevel) {
    LoggerLevel[LoggerLevel["ERROR"] = 0] = "ERROR";
    LoggerLevel[LoggerLevel["WARN"] = 1] = "WARN";
    LoggerLevel[LoggerLevel["INFO"] = 2] = "INFO";
    LoggerLevel[LoggerLevel["DEBUG"] = 3] = "DEBUG";
    LoggerLevel[LoggerLevel["TRACE"] = 4] = "TRACE";
})(LoggerLevel || (LoggerLevel = {}));
export class Logger {
    static debug = (...args) => { };
    static error = (...args) => console.error(...args);
    static info = (...args) => { };
    static warn = (...args) => { };
    static trace = (...args) => { };
    static setLevel(loggerLevel) {
        Logger.debug = (...args) => { };
        Logger.error = (...args) => console.error(...args);
        Logger.info = (...args) => { };
        Logger.warn = (...args) => { };
        Logger.trace = (...args) => { };
        if (loggerLevel >= LoggerLevel.TRACE)
            Logger.trace = (...args) => console.log(...args);
        if (loggerLevel >= LoggerLevel.DEBUG)
            Logger.debug = (...args) => console.debug(...args);
        if (loggerLevel >= LoggerLevel.INFO)
            Logger.info = (...args) => console.info(...args);
        if (loggerLevel >= LoggerLevel.WARN)
            Logger.warn = (...args) => console.warn(...args);
    }
}
