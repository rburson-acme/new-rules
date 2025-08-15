import { Id as ThredlibId } from '../thredlib/core/Id.js';

export class Id {
  static getNextThredId(patternName: string): string {
    return `${patternName}_${ThredlibId.generate()}`;
  }
}
