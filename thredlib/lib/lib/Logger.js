export var LoggerLevel;
(function (LoggerLevel) {
    LoggerLevel[LoggerLevel["NONE"] = 0] = "NONE";
    LoggerLevel[LoggerLevel["ERROR"] = 1] = "ERROR";
    LoggerLevel[LoggerLevel["WARN"] = 2] = "WARN";
    LoggerLevel[LoggerLevel["INFO"] = 3] = "INFO";
    LoggerLevel[LoggerLevel["DEBUG"] = 4] = "DEBUG";
    LoggerLevel[LoggerLevel["TRACE"] = 5] = "TRACE";
})(LoggerLevel || (LoggerLevel = {}));
export class Logger {
    static debug = (...args) => { };
    static error = (...args) => console.error(...args);
    static info = (...args) => { };
    static warn = (...args) => { };
    static trace = (...args) => { };
    static setLevel(loggerLevel) {
        Logger.debug = (...args) => { };
        Logger.error = (...args) => { };
        Logger.info = (...args) => { };
        Logger.warn = (...args) => { };
        Logger.trace = (...args) => { };
        if (loggerLevel >= LoggerLevel.ERROR)
            Logger.error = (...args) => console.error(...args);
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
