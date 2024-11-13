export interface AgentConfig {
    name: string;
    nodeType: string;
    nodeId: string;
    agentImpl: string | object;
    // the rascal Message topic to use from the rascal.config
    subscriptionName: string;
    // specific agent configuration can go here
    customConfig?: any;
}

export class Config {
    static agentConfig: AgentConfig;
}
