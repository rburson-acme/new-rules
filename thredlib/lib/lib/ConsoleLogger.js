import { LoggerLevel, nameLevelMap } from './Logger.js';
export class ConsoleLogger {
    debug = (args, error) => { };
    info = (args, error) => { };
    warn = (args, error) => { };
    // should always be enabled
    error = (args, error) => error ? console.error(args, error) : console.error(args);
    trace = (args, error) => { };
    logObject = (args) => { };
    constructor() {
        const levelName = process.env.LOG_LEVEL || 'info';
        this.setLevel(nameLevelMap[levelName]);
    }
    setLevel(loggerLevel) {
        //reset all to no-ops
        this.debug = (args, error) => { };
        this.info = (args, error) => { };
        this.warn = (args, error) => { };
        this.error = (args, error) => { };
        this.trace = (args, error) => { };
        this.logObject = (args) => { };
        if (loggerLevel >= LoggerLevel.TRACE)
            this.trace = (args, error) => error ? console.trace(args, error) : console.trace(args);
        if (loggerLevel >= LoggerLevel.DEBUG)
            this.debug = (args, error) => error ? console.debug(args, error) : console.debug(args);
        if (loggerLevel >= LoggerLevel.INFO)
            this.info = (args, error) => error ? console.info(args, error) : console.info(args);
        if (loggerLevel >= LoggerLevel.WARN)
            this.warn = (args, error) => error ? console.warn(args, error) : console.warn(args);
        if (loggerLevel >= LoggerLevel.ERROR)
            this.error = (args, error) => error ? console.error(args, error) : console.error(args);
        if (loggerLevel >= LoggerLevel.DEBUG)
            this.logObject = (args) => console.dir(args, { depth: null, colors: true });
    }
}
