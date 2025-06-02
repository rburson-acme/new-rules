import { PermissionModel } from '../thredlib/model/PermissionModel';

export class Permissions {
  constructor(readonly permissionModel: PermissionModel) {}
  allowsRole(role: string): boolean {
    return !!this.permissionModel?.allowedRoles.includes(role);
  }
}
