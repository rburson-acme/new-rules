export declare class Id {
    private static id;
    static get nextEventId(): string;
    static getNextId(prefix: string): string;
}
