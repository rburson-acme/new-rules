import { Expression, ExpressionParams } from './Expression.js';

export class Transformer {

    static prefix: string = '$xpr';

    static transformObject(source: any, expressionParams: ExpressionParams): any {
        if (source === null || source === undefined) {
            return undefined;
        }
        if (Array.isArray(source)) {
            return source.map(p => Transformer.transformObject(p, expressionParams));
        } if (typeof source === 'object') {
            let target: any = {};
            Object.keys(source).forEach((key) => {
                if (key === Transformer.prefix) {
                    target = {
                        ...target,
                        ...Transformer.transformObject(new Expression(source[key]).apply(expressionParams), expressionParams),
                    };
                } else {
                    target[key] = Transformer.transformObject(source[key], expressionParams);
                }
            });
            return target;
        } if (typeof source === 'string') {
            if (source.startsWith(`${Transformer.prefix}(`)) {
                const expr = source.substring(Transformer.prefix.length + 1, source.length - 1).trim();
                return Transformer.transformObject(new Expression(expr).apply(expressionParams), expressionParams);
            }
        }
        return source;
    }
}
