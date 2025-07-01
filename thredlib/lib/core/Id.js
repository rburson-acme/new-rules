import { nanoid } from "nanoid";
// @TODO get faster ids
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
