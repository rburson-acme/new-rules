import { PermissionModel } from '../thredlib/model/PermissionModel.js';

export class Permissions {
  constructor(readonly permissionModel: PermissionModel) {}
  allowsRole(role: string): boolean {
    return !!this.permissionModel?.allowedRoles.includes(role);
  }
}
