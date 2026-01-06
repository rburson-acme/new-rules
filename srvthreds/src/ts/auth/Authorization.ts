import { error } from 'ajv/dist/vocabularies/applicator/dependencies.js';
import { System } from '../engine/System.js';
import { hasRole } from '../sessions/Session.js';
import { errorCodes, errorKeys, EventThrowable } from '../thredlib/index.js';

export class Authorization {
  static async verifyRole(participantId: string, roleName: string): Promise<boolean> {
    if (
      !(await System.getSessions().getSessionsFor(participantId)).some(async (session) => hasRole(session, roleName))
    ) {
      throw EventThrowable.get({
        message: `Participant ${participantId} lacks required role: ${roleName}`,
        code: errorCodes[errorKeys.UNAUTHORIZED].code,
      });
    }
    return true;
  }
}
