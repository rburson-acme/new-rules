import { Event } from '../core/Event.js';

export interface ExpressionContext {

    setLocal(name: string, value: any): void;
    getLocal(name: string): any;

}