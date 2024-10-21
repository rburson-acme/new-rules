import jsonata from 'jsonata';
import { Logger } from '../lib/Logger.js';
import { defaultBindings } from './defaultBindings.js';
export class Expression {
    expression;
    constructor(expr) {
        try {
            this.expression = jsonata(expr);
        }
        catch (e) {
            const msg = `Invalid Expr: '${expr}' :: ${e.message}`;
            Logger.warn(msg);
            throw new Error(msg);
        }
    }
    async apply(params, bindings = {}) {
        try {
            // await and catch any errors before returning
            return await this.expression.evaluate(params, this.bindingSetup(bindings, params));
        }
        catch (e) {
            const msg = `apply failed while evaluating expr: '${this.expression}' :: ${e.message}`;
            Logger.warn(msg);
            throw new Error(msg);
        }
    }
    bindingSetup(bindings, params) {
        return {
            ...defaultBindings(params),
            ...bindings,
        };
    }
}
