import { Event } from '../core/Event.js';

export interface ExpressionContext {

    thredId: string | undefined;
    setLocal(name: string, value: any): void;
    getLocal(name: string): any;

}