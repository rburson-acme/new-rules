export interface Identifiable {
   id: string | number;
}

export const nullish: (value: any) => boolean  = (value) => {
    return value === null || value === undefined;
}

// remove if present, and return a new list
export const remove: (array: any[], item: any, equals?: (item1:any, item2:any)=>boolean) => any[] = (array, item, equals) => {
    return array.filter((arrayItem) => {
        if(equals) {
            return !equals(item, arrayItem);
        }
        return item !== arrayItem;
    });
}

// Add 'in place' if item is not already in the list
export const addUnique: (array: any[], item: any, equals?: (item1:any, item2:any)=>boolean) => void = (array, item, equals) => {
    if(!array.some((arrayItem) => {
        if(equals) {
            return equals(item, arrayItem);
        }
        return item === arrayItem;
    })) {
       array.push(item); 
    }
}

export const removeById: (array: Identifiable[] | string[], item: Identifiable | string) => any[] = (array, item) => {
    if(typeof item === 'object') {
        return remove(array, item, (item1, item2) => item1.id === item2.id);
    } else {
        return remove(array, item);
    }
}

export const addUniqueById: (array: Identifiable[] | string[], item: Identifiable | string) => void = (array, item) => {
    if(typeof item === 'object') {
        return addUnique(array, item, (item1, item2) => item1.id === item2.id);
    } else {
        return addUnique(array, item);
    }
}
