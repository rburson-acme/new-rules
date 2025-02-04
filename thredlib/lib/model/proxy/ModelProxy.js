export function createProxy(obj, newFields) {
    return new Proxy(obj, {
        get(target, prop) {
            if (prop in newFields) {
                return newFields[prop];
            }
            return target[prop];
        }
    });
}
