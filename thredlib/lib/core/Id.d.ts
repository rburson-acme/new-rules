export declare class Id {
    static get nextEventId(): string;
    static getNextId(prefix: string): string;
    static generate(): string;
}
