
// @todo get real ids
export class Id {

    private static sessionId = 0;

    static get nextSessionId(): string {
        return `wt${Date.now()}${Id.sessionId++}`;
    }

}