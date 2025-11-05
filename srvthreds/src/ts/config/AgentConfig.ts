import { Config } from './Config.js';
import { AgentConfigDef } from './ConfigDefs.js';

export class AgentConfig implements Config<AgentConfigDef> {
  private configDef?: AgentConfigDef;

  constructor(
    readonly nodeId: string,
    configDef?: AgentConfigDef,
  ) {
    if (configDef) {
      this.configDef = configDef;
    }
  }

  async updateConfig(configDef: AgentConfigDef): Promise<void> {
    this.configDef = configDef;
  }

  get name(): string {
    this.checkInitialized();
    return this.configDef!.name;
  }
  get nodeType(): string {
    this.checkInitialized();
    return this.configDef!.nodeType;
  }
  get agentImpl(): string | object {
    this.checkInitialized();
    return this.configDef!.agentImpl;
  }
  get subscriptionNames(): string[] {
    this.checkInitialized();
    return this.configDef!.subscriptionNames;
  }
  get customConfig(): any {
    this.checkInitialized();
    return this.configDef!.customConfig;
  }
  get eventTypes(): [{ type: string }] | undefined {
    this.checkInitialized();
    return this.configDef!.eventTypes;
  }
  get eventProcessingWait(): number | undefined {
    this.checkInitialized();
    return this.configDef!.eventProcessingWait;
  }
  get shutdownDelay(): number | undefined {
    this.checkInitialized();
    return this.configDef!.shutdownDelay;
  }
  get authToken(): string | undefined {
    this.checkInitialized();
    return this.configDef!.authToken;
  }
  get authorizedTokens(): string | undefined {
    this.checkInitialized();
    return this.configDef!.authorizedTokens;
  }

  private checkInitialized() {
    if (!this.configDef) {
      throw new Error('AgentConfig: configDef not initialized');
    }
  }
}
