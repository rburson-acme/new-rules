import { ExpressionParams } from './Expression.js';
export declare class Transformer {
    static prefix: string;
    static transformObject(source: any, expressionParams: ExpressionParams): Promise<any>;
}
