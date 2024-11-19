
export const systemPermission = 'admin';
export interface PermissionModel {
    readonly name?: string;
    readonly description?: string;
    readonly roles: string[];
}