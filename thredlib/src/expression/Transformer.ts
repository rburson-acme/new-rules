import { Series } from '../lib/Async.js';
import { Expression, ExpressionParams } from './Expression.js';

export class Transformer {
  static prefix: string = '$xpr';

  static async transformObject(source: any, expressionParams: ExpressionParams): Promise<any> {
    if (source === null || source === undefined) {
      return undefined;
    }
    if (Array.isArray(source)) {
      return await Series.map(source, (p) => Transformer.transformObject(p, expressionParams));
    }
    if (typeof source === 'object') {
      let target: any = {};
      await Series.forEach(Object.keys(source), async (key) => {
        if (key === Transformer.prefix) {
          target = {
            ...target,
            ...(await Transformer.transformObject(
              await new Expression(source[key]).apply(expressionParams),
              expressionParams,
            )),
          };
        } else {
          target[key] = await Transformer.transformObject(source[key], expressionParams);
        }
      });
      return target;
    }
    if (typeof source === 'string') {
      if (source.startsWith(`${Transformer.prefix}(`)) {
        const expr = source.substring(Transformer.prefix.length + 1, source.length - 1).trim();
        return Transformer.transformObject(await new Expression(expr).apply(expressionParams), expressionParams);
      }
    }
    return source;
  }
}
