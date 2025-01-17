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
    static logObject = (...args) => { };
    static info = (...args) => { };
    static warn = (...args) => { };
    // should always be enabled
    static error = (...args) => console.error(...args);
    static trace = (...args) => { };
    static setLevel(loggerLevel) {
        Logger.debug = (...args) => { };
        Logger.logObject = (...args) => { };
        Logger.info = (...args) => { };
        Logger.warn = (...args) => { };
        Logger.error = (...args) => { };
        Logger.trace = (...args) => { };
        if (loggerLevel >= LoggerLevel.TRACE)
            Logger.trace = (...args) => console.trace(...args);
        if (loggerLevel >= LoggerLevel.DEBUG)
            Logger.debug = (...args) => console.debug(...args);
        if (loggerLevel >= LoggerLevel.INFO)
            Logger.info = (...args) => console.info(...args);
        if (loggerLevel >= LoggerLevel.WARN)
            Logger.warn = (...args) => console.warn(...args);
        if (loggerLevel >= LoggerLevel.ERROR)
            Logger.error = (...args) => console.error(...args);
        if (loggerLevel >= LoggerLevel.DEBUG)
            Logger.logObject = (...args) => {
                if (args?.length) {
                    if (args.length === 1) {
                        console.dir(args[0], { depth: null, colors: true });
                    }
                    else {
                        console.debug(args[0]);
                        console.dir(args[1], { depth: null, colors: true });
                    }
                }
            };
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
