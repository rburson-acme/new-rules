import { ExpressionContext } from "./ExpressionContext.js";
export declare class SimpleContext implements ExpressionContext {
    private readonly scope;
    constructor(params?: {
        thredId: string;
        scope?: Record<string, any>;
    });
    setLocal(name: string, value: any): void;
    getLocal(name: string): any;
    getThredId(): string | undefined;
}
