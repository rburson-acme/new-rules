export function createProxy<T extends object, N extends { [key: string]: any }>(
  obj: T,
  newFields: N
): T & N {
  return new Proxy(obj, {
    get(target, prop: string) {
      if (prop in newFields) {
        return newFields[prop];
      }
      return (target as any)[prop];
    }
  }) as T & N;
}
