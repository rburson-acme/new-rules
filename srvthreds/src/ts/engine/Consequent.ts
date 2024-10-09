import { ConsequentModel, Event, Expression } from '../thredlib/index.js';
import { ThredStore } from "./store/ThredStore.js";

/*
    @IMPORTANT any mutations here must be made in the Store
    This is part of the 'stateless' tree that gets shared across processes
*/
export class Consequent {

    private expression: Expression;

    constructor(consequentModel: ConsequentModel) {
        // note: we could defer compilation here until first use
        // it'll be a pattern startup time vs. application time decision
        this.expression = new Expression(consequentModel.xpr);
    }

    async apply(event: Event, thredStore: ThredStore): Promise<any> {
        const context = thredStore.thredContext;
        return this.expression.apply({ event, context });
    } 

}