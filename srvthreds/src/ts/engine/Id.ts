
// @todo get real ids
export class Id {

    private static thredId = 0;
    private static eventId = 0;
    private static sessionId = 0;

    static getNextThredId(patternName: string): string {
        return `${patternName}${Date.now()}${Id.thredId++}`;
    }

    static get nextEventId(): string {
        return `evt${Date.now()}${Id.eventId++}`;
    }

}