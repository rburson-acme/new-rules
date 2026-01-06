import { Role } from '../thredlib/persistence/Role.js';

export interface Session {
  id: string;
  nodeId?: string;
  data?: {
    isProxy?: boolean;
    roles?: Role[];
  };
}

export function hasRole(session: Session, roleName: string): boolean {
  if (!session.data?.roles) return false;
  return session.data.roles.some((role) => role.name === roleName);
}
