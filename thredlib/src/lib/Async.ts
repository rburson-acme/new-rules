import { nullish } from './lib.js';

/**
 * Use these if your callbacks need to complete in the order submitted, synchronously
 */
export class Series {
  static async forEach<T>(array: T[], callback: (item: T, index: number, array: T[]) => Promise<void>): Promise<void> {
    for (let index = 0; index < array.length; index++) {
      await callback(array[index], index, array);
    }
  }

  static async map<S, T>(array: S[], callback: (item: S, index: number, array: S[]) => Promise<T>): Promise<T[]> {
    const mappedValues: T[] = new Array(array.length);
    for (let index = 0; index < array.length; index++) {
      mappedValues[index] = await callback(array[index], index, array);
    }
    return mappedValues;
  }

  static async filter<T>(array: T[], callback: (item: T, index: number, array: T[]) => Promise<boolean>): Promise<T[]> {
    const newValues: T[] = [];
    for (let index = 0; index < array.length; index++) {
      (await callback(array[index], index, array)) && newValues.push(array[index]);
    }
    return newValues;
  }

  static async reduce<S, T>(
    array: S[],
    callback: (accumlator: any, item: S, index: number, array: S[]) => any,
    initialValue: any,
  ): Promise<T> {
    let startIndex = 0;
    let accumulator = initialValue;
    if (nullish(accumulator)) {
      if (array.length === 1) return array[0] as any;
      startIndex = 1;
      accumulator = array[0];
    }
    for (let index = startIndex; index < array.length; index++) {
      accumulator = await callback(accumulator, array[index], index, array);
    }
    return accumulator;
  }

  static async some<T>(
    array: T[],
    callback: (item: T, index: number, array: T[]) => Promise<boolean>,
  ): Promise<boolean> {
    for (let index = 0; index < array.length; index++) {
      if (await callback(array[index], index, array)) {
        return true;
      }
    }
    return false;
  }
}

/**
 * Use these if it doesn't matter what order your callbacks complete in
 */
export class Parallel {
  static async forEach<T>(array: T[], callback: (item: T, index: number, array: T[]) => Promise<void>): Promise<void> {
    await Promise.all(array.map(async (item, index) => callback(item, index, array)));
  }

  static map<S, T>(array: S[], callback: (item: S, index: number, array: S[]) => Promise<T>): Promise<T[]> {
    return Promise.all(array.map(callback));
  }

  static async filter<T>(array: T[], callback: (item: T, index: number, array: T[]) => Promise<boolean>): Promise<T[]> {
    const filterResults: boolean[] = await Parallel.map(array, callback);
    return array.filter((item, index) => filterResults[index]);
  }

  static some<T>(array: T[], callback: (item: T, index: number, array: T[]) => Promise<boolean>): Promise<boolean> {
    return new Promise((resolve) => {
      Promise.all(
        array.map(async (item, index) => {
          const result = await callback(item, index, array);
          if (result) {
            resolve(true);
          }
          return result;
        }),
      ).then((completed) => {
        !completed.some((item) => item) && resolve(false);
      });
    });
  }
}
