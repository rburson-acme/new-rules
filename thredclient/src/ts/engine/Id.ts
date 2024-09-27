
// @todo get real ids
export class Id {

    static nextEventId(userId: string): string {
        return `${userId}_${Date.now()}`;
    }

}