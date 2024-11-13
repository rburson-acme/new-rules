// @TODO get real (fast) ids
export class Id {
  private static id = 0;

  static get nextEventId(): string {
    return `evt${Date.now()}${Id.id++}`;
  }

  static getNextId(prefix: string): string {
    return `${prefix}${Date.now()}${Id.id++}`;
  }
}
