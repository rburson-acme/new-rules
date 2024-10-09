export interface ResolverConfig {
    agents:
        {
            name: string;
            nodeType: string;
            address: string;
        }[]
}

export class Config {
    static resolverConfig: ResolverConfig;
}
