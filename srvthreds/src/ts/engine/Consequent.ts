import { ConsequentModel, Event, Expression } from '../thredlib/index.js';
import { ThredStore } from './store/ThredStore.js';

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

  async apply(inboundEvent: Event, thredStore: ThredStore, outboundEvent?: Event): Promise<any> {
    const context = thredStore.thredContext;
    // add a binding to make outboundEvent available in the expression
    const bindings = { outboundEvent };
    return this.expression.apply({ event: inboundEvent, context }, bindings);
  }
}
