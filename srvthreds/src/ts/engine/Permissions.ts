import { PermissionModel } from "../thredlib/model/PermissionModel";

export class Permissions {
    constructor(readonly permissionModel: PermissionModel) {
    }
    hasAdminRole(): boolean {
        return !!this.permissionModel?.roles.includes('admin');
    }
}