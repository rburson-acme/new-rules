import { LoggerLevel, nameLevelMap } from './Logger.js';
export class ConsoleLogger {
    debug = (args, error) => { };
    info = (args, error) => { };
    warn = (args, error) => { };
    // should always be enabled
    error = (args, error) => (error ? console.error(args, error) : console.error(args));
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
        this.assignLogger(loggerLevel, LoggerLevel.TRACE, 'trace', console.trace.bind(console));
        this.assignLogger(loggerLevel, LoggerLevel.DEBUG, 'debug', console.debug.bind(console));
        this.assignLogger(loggerLevel, LoggerLevel.INFO, 'info', console.info.bind(console));
        this.assignLogger(loggerLevel, LoggerLevel.WARN, 'warn', console.warn.bind(console));
        this.assignLogger(loggerLevel, LoggerLevel.ERROR, 'error', console.error.bind(console));
        if (loggerLevel >= LoggerLevel.DEBUG)
            this.logObject = (args) => console.dir(args, { depth: null, colors: true });
    }
    h1(message) {
        return `
 ___  ___  ___  ___  ___  ___  ___  ___  ___  ___  ___  ___  ___
(___)(___)(___)(___)(___)(___)(___)(___)(___)(___)(___)(___)(___)

${message}
 ___  ___  ___  ___  ___  ___  ___  ___  ___  ___  ___  ___  ___
(___)(___)(___)(___)(___)(___)(___)(___)(___)(___)(___)(___)(___)
`;
    }
    h2(message) {
        return `
${message}
___  ___  ___  ___  ___  ___  ___  ___  ___  ___  ___  ___  ___ ___
`;
    }
    crit(message) {
        return `
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

${message}

!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
`;
    }
    assignLogger(currentLevel, requiredLevel, loggerName, consoleFn) {
        if (currentLevel >= requiredLevel) {
            this[loggerName] = (args, error) => {
                if (error) {
                    consoleFn(args, error);
                }
                else {
                    consoleFn(args);
                }
            };
        }
    }
}
