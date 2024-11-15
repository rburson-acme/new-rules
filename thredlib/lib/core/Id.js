// @TODO get real (fast) ids
export class Id {
    static id = 0;
    static get nextEventId() {
        return `evt${Date.now()}${Id.id++}`;
    }
    static getNextId(prefix) {
        return `${prefix}${Date.now()}${Id.id++}`;
    }
}
