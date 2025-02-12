import { ExpressionContext } from '../thredlib/index.js';
import { EventsStore } from './store/EventsStore.js';

export class ThredContext implements ExpressionContext {

    readonly thredId: string | undefined;
    private readonly scope: Record<string, any>;

    constructor(params?: { thredId: string, scope?: Record<string, any>, permissions?: any }) {
       this.thredId = params?.thredId ?? undefined; 
       this.scope = params?.scope || {};
    }

    // @todo keep every 'instance' of local + it's reaction if we need to time travel
    setLocal(name: string, value: any) {
        this.scope[name] = value;
    }

    getLocal(name: string) {
        return this.scope[name];
    }

    getState() {
        return {
            thredId: this.thredId,
            scope: this.scope,
        }
    }

    static fromState(state: any): ThredContext {
        const { thredId, scope } = state;
        return new ThredContext({ thredId, scope, })
    }

}