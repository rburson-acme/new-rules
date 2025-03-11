import { nanoid } from "nanoid";
// @TODO get real (fast) ids
export class Id {
    static get nextEventId() {
        return `evt${this.generate()}`;
    }
    static getNextId(prefix) {
        return `${prefix}${this.generate()}`;
    }
    static generate() {
        return nanoid();
    }
}
