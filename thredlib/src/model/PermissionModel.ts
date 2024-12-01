
export interface PermissionModel {
    readonly name?: string;
    readonly description?: string;
    readonly allowedRoles: string[];
}