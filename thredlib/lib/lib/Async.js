import { nullish } from './lib.js';
/**
 * Use these if your callbacks need to complete in the order submitted, synchronously
 */
export class Series {
    static async forEach(array, callback) {
        for (let index = 0; index < array.length; index++) {
            await callback(array[index], index, array);
        }
    }
    static async map(array, callback) {
        const mappedValues = new Array(array.length);
        for (let index = 0; index < array.length; index++) {
            mappedValues[index] = await callback(array[index], index, array);
        }
        return mappedValues;
    }
    static async filter(array, callback) {
        const newValues = [];
        for (let index = 0; index < array.length; index++) {
            (await callback(array[index], index, array)) && newValues.push(array[index]);
        }
        return newValues;
    }
    static async reduce(array, callback, initialValue) {
        let startIndex = 0;
        let accumulator = initialValue;
        if (nullish(accumulator)) {
            if (array.length === 1)
                return array[0];
            startIndex = 1;
            accumulator = array[0];
        }
        for (let index = startIndex; index < array.length; index++) {
            accumulator = await callback(accumulator, array[index], index, array);
        }
        return accumulator;
    }
    static async some(array, callback) {
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
    static async forEach(array, callback) {
        await Promise.all(array.map(async (item, index) => callback(item, index, array)));
    }
    static map(array, callback) {
        return Promise.all(array.map(callback));
    }
    static async filter(array, callback) {
        const filterResults = await Parallel.map(array, callback);
        return array.filter((item, index) => filterResults[index]);
    }
    static some(array, callback) {
        return new Promise((resolve) => {
            Promise.all(array.map(async (item, index) => {
                const result = await callback(item, index, array);
                if (result) {
                    resolve(true);
                }
                return result;
            })).then((completed) => {
                !completed.some((item) => item) && resolve(false);
            });
        });
    }
}
