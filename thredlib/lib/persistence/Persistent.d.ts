export interface Persistent extends Record<string, any> {
    id: string;
    created: Date;
    modified: Date;
}
