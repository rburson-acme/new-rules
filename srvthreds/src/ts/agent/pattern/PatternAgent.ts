import { Logger } from '../../thredlib/index.js';
import { MessageHandlerParams } from '../AgentService.js';
import { PatternAdapter, PatternAdapterConfig } from './PatternAdapter.js';
import { ConfigLoader } from '../../config/ConfigLoader.js';
import BaseAgent from '../base/BaseAgent.js';

export interface PatternAgentConfig {
  provider?: string;
  model?: string;
  apiKey?: string;
  patternReferenceName?: string;
  patternReferencePath?: string;
  patternSchemaName?: string;
  patternSchemaPath?: string;
  jsonataReferenceName?: string;
  jsonataReferencePath?: string;
  eventSchemaName?: string;
  eventSchemaPath?: string;
  systemSpecSchemaName?: string;
  systemSpecSchemaPath?: string;
  systemSpecName?: string;
  systemSpecPath?: string;
}

export interface PatternAgentArgs {
  provider?: string;
  model?: string;
  apiKey?: string;
  patternReferenceName?: string;
  patternReferencePath?: string;
  patternSchemaName?: string;
  patternSchemaPath?: string;
  jsonataReferenceName?: string;
  jsonataReferencePath?: string;
  eventSchemaName?: string;
  eventSchemaPath?: string;
  systemSpecSchemaName?: string;
  systemSpecSchemaPath?: string;
  systemSpecName?: string;
  systemSpecPath?: string;
}

export class PatternAgent extends BaseAgent {
  private patternAgentArgs: PatternAgentArgs;

  constructor({ config, eventPublisher, additionalArgs }: MessageHandlerParams) {
    const args = additionalArgs as PatternAgentArgs | undefined;
    const adapterConfig: PatternAdapterConfig = {
      provider: args?.provider || config.customConfig?.provider,
      model: args?.model || config.customConfig?.model,
      apiKey: args?.apiKey || config.customConfig?.apiKey,
    };
    super({
      config,
      eventPublisher,
      additionalArgs,
      adapter: new PatternAdapter(adapterConfig),
    });
    this.patternAgentArgs = args || {};
  }

  async initialize(): Promise<void> {
    const customConfig = this.agentConfig.customConfig as PatternAgentConfig | undefined;

    const patternReference = await this.loadRequired('patternReference', customConfig);
    const patternSchema = await this.loadRequired('patternSchema', customConfig);
    const jsonataReference = await this.loadRequired('jsonataReference', customConfig);
    const eventSchema = await this.loadRequired('eventSchema', customConfig);
    const systemSpecSchema = await this.loadRequired('systemSpecSchema', customConfig);
    const systemSpec = await this.loadRequired('systemSpec', customConfig);

    (this.adapter as PatternAdapter).setContext({
      patternReference: JSON.stringify(patternReference, null, 2),
      patternSchema: JSON.stringify(patternSchema, null, 2),
      jsonataReference: JSON.stringify(jsonataReference, null, 2),
      eventSchema: JSON.stringify(eventSchema, null, 2),
      systemSpecSchema: JSON.stringify(systemSpecSchema, null, 2),
      systemSpec: JSON.stringify(systemSpec, null, 2),
    });

    await super.initialize();
  }

  private async loadRequired(resource: string, customConfig?: PatternAgentConfig): Promise<any> {
    const nameKey = `${resource}Name` as keyof PatternAgentArgs;
    const pathKey = `${resource}Path` as keyof PatternAgentArgs;
    const name = this.patternAgentArgs[nameKey] || customConfig?.[nameKey as keyof PatternAgentConfig];
    const path = this.patternAgentArgs[pathKey] || customConfig?.[pathKey as keyof PatternAgentConfig];

    if (!name && !path) throw new Error(`PatternAgent: ${resource}Name or ${resource}Path must be provided`);

    const result = await ConfigLoader.loadFromNameOrPath(name as string, path as string);
    Logger.info(`PatternAgent: Loaded ${resource} from ${path || name}`);
    return result;
  }

  shutdown(): Promise<void> {
    return Promise.resolve();
  }
}

export default PatternAgent;
