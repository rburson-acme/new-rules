import { StringMap } from '../thredlib/index.js';
import { Event } from '../thredlib/index.js';
import { ExpressionContext } from '../thredlib/index.js';
import { EventStore } from './store/EventStore.js';

export class ThredContext implements ExpressionContext {

    readonly thredId: string | undefined;
    private readonly scope: StringMap<any>;

    constructor(params?: { thredId: string, scope?: StringMap<any> }){
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

    static fromState(state: any, eventStore: EventStore): ThredContext {
        const { thredId, scope } = state;
        return new ThredContext({ thredId, scope, })
    }

}