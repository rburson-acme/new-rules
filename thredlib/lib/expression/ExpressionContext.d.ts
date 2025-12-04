export interface ExpressionContext {
    setLocal(name: string, value: any): void;
    getLocal(name: string): any;
    getThredId(): string | undefined;
}
