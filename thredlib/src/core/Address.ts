export type Address = string[] | string;
export function addressToArray(address: Address): string[] {
    if (Array.isArray(address)) {
        return address;
    } else if (typeof address === 'string') {
        return [address];
    } else {
        throw new Error(`Invalid address type: ${typeof address}`);
    }   
}