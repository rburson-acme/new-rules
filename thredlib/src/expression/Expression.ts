import jsonata from 'jsonata';
import { Event } from '../core/Event.js';
import { Logger } from '../lib/Logger.js';
import { defaultBindings } from './defaultBindings.js';
import { ExpressionContext } from './ExpressionContext.js';

export type ExpressionParams = { event: Event; context: ExpressionContext };

export class Expression {
  private readonly expression: jsonata.Expression;

  constructor(expr: string) {
    try {
      this.expression = jsonata(expr);
    } catch (e: any) {
      const msg = `Invalid Expr: '${expr}' :: ${e.message}`;
      Logger.warn(msg);
      throw new Error(msg);
    }
  }

  async apply(params: ExpressionParams, bindings: Record<string, string> = {}): Promise<any> {
    try {
      // await and catch any errors before returning
      return await this.expression.evaluate(params, this.bindingSetup(bindings, params));
    } catch (e: any) {
      const msg = `apply failed while evaluating expr: '${this.expression}' :: ${e.message}`;
      Logger.warn(msg);
      throw new Error(msg);
    }
  }

  bindingSetup(bindings: Record<string, string>, params: ExpressionParams) {
    return {
      ...defaultBindings(params),
      ...bindings,
    };
  }
}
