import { ConsequentModel, Event, Expression } from '../thredlib/index.js';
import { ThredStore } from './store/ThredStore.js';

/*
    @IMPORTANT any mutations here must be made in the Store
    This is part of the 'stateless' tree that gets shared across processes
*/
export class Consequent {
  private expression?: Expression;

  constructor(consequentModel: ConsequentModel) {
    if (consequentModel.xpr) {
      this.expression = new Expression(consequentModel.xpr);
    }
  }

  async apply(inboundEvent: Event, thredStore: ThredStore, outboundEvent?: Event): Promise<any> {
    const context = thredStore.thredContext;
    const bindings = { outboundEvent };
    if (this.expression) {
      return this.expression.apply({ event: inboundEvent, context }, bindings);
    }
  }
}
