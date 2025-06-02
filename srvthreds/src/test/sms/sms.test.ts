import { Logger, LoggerLevel } from '../../ts/thredlib/index.js';
import { Sms } from '../../ts/agent/sms/Sms.js';

Logger.setLevel(LoggerLevel.INFO);

describe('sms', function () {
  test('send message', function () {
    return sms.dispatch('+16789820988');
  });
});

const sms = new Sms();
