import 'dotenv/config';
import { Logger } from '../thredlib/index.js';
import { PinoLogger } from '../logger/PinoLogger.js';

Logger.loggerDelegate = new PinoLogger();
