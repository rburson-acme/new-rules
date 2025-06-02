import { Id as ThredlibId } from '../thredlib/core/Id';

export class Id {
  static getNextThredId(patternName: string): string {
    return `${patternName}_${ThredlibId.generate()}`;
  }
}
