export function addressToArray(address) {
    if (Array.isArray(address)) {
        return address;
    }
    else if (typeof address === 'string') {
        return [address];
    }
    else {
        throw new Error(`Invalid address type: ${typeof address}`);
    }
}
