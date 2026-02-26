import { generateText } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { Event, Logger, errorCodes, errorKeys } from '../../thredlib/index.js';
import { EventThrowable } from '../../thredlib/core/Errors.js';
import { Adapter } from '../adapter/Adapter.js';
import { PatternPrompt } from './PatternPrompt.js';

export interface PatternAdapterConfig {
  provider?: string;
  model?: string;
  apiKey?: string;
}

export interface PatternContext {
  patternReference: string;
  patternSchema: string;
  jsonataReference: string;
  eventSchema: string;
  systemSpecSchema: string;
  systemSpec: string;
}

export class PatternAdapter implements Adapter {
  private context?: PatternContext;

  constructor(private config: PatternAdapterConfig) {}

  async initialize(): Promise<void> {}

  setContext(context: PatternContext) {
    this.context = context;
  }

  async execute(event: Event): Promise<any> {
    if (!this.context) throw new Error('PatternAdapter: context not set, call setContext() first');

    const values = event.data?.content?.values as Record<string, any> | undefined;
    if (!values || Array.isArray(values) || !values.prompt) {
      throw EventThrowable.get({
        message: 'No prompt provided for pattern generation',
        code: errorCodes[errorKeys.MISSING_ARGUMENT_ERROR].code,
      });
    }

    const systemPrompt = PatternPrompt.buildSystemPrompt(this.context);
    const model = this.getModel();

    Logger.debug(`PatternAdapter: Generating pattern with provider=${this.config.provider}, model=${this.config.model}`);
    Logger.debug(`PatternAdapter: System prompt:\n${systemPrompt}`);
    Logger.debug(`PatternAdapter: User prompt:\n${values.prompt}`);

    const result = await generateText({ model, system: systemPrompt, prompt: values.prompt });
    //const result = { text: '{ "name": "Example Pattern", "reactions": [{}] }' };

    Logger.debug(`PatternAdapter: Result:\n${result.text}`);

    return this.parsePatternResponse(result.text);
  }

  private getModel() {
    const providerName = this.config.provider || 'anthropic';
    const modelName = this.config.model || 'claude-sonnet-4-20250514';

    if (providerName === 'openai') {
      const provider = createOpenAI({ apiKey: this.config.apiKey });
      return provider(modelName);
    }
    const provider = createAnthropic({ apiKey: this.config.apiKey });
    return provider(modelName);
  }

  private parsePatternResponse(text: string): any {
    // Strip markdown fences if present
    let jsonText = text.trim();
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
    }

    let pattern: any;
    try {
      pattern = JSON.parse(jsonText);
    } catch (e) {
      throw EventThrowable.get({
        message: `Failed to parse generated pattern as JSON: ${(e as Error).message}`,
        code: errorCodes[errorKeys.TASK_ERROR].code,
      });
    }

    if (!pattern.name || !Array.isArray(pattern.reactions)) {
      throw EventThrowable.get({
        message: 'Generated pattern is missing required fields (name, reactions)',
        code: errorCodes[errorKeys.ARGUMENT_VALIDATION_ERROR].code,
      });
    }

    return pattern;
  }
}
