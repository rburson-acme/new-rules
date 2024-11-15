import { ExpressionContext } from "./ExpressionContext.js";

export class SimpleContext implements ExpressionContext {

    private readonly scope: Record<string, any>;

    constructor(params?: { thredId: string, scope?: Record<string, any> }){
       this.scope = params?.scope || {};
    }

    setLocal(name: string, value: any) {
        this.scope[name] = value;
    }

    getLocal(name: string) {
        return this.scope[name];
    }

}