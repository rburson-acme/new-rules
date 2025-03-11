import { nanoid } from "nanoid";

// @TODO get real (fast) ids
export class Id {

  static get nextEventId(): string {
    return `evt${this.generate()}`;
  }

  static getNextId(prefix: string): string {
    return `${prefix}${this.generate()}`;
  }

  static generate(): string {
    return nanoid();
  }
}
