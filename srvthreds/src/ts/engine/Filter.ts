import { Expression } from '../thredlib/index.js';
import { FilterModel } from '../thredlib/index.js';
import { Condition, ConditionResult } from './Condition.js';
import { ThredContext } from './ThredContext.js';
import { Event } from '../thredlib/index.js';
import { ThredStore } from './store/ThredStore.js';
import { ConditionFactory } from './ConditionFactory.js';

/*
    @IMPORTANT any mutations here must be made in the Store
    This is part of the 'stateless' tree that gets shared across processes
    First Condition in a Pattern must NOT apply side-effects because of the test method!
*/
export class Filter extends Condition {
  private readonly expression: Expression;
  constructor(filterModel: FilterModel, conditionFactory: ConditionFactory, id: string) {
    super(filterModel, conditionFactory, id);
    // note: we could defer compilation here until first use
    // it'll be a pattern startup time vs. application time decision
    this.expression = new Expression(filterModel.xpr);
  }

  async applyCondition(event: Event, thredStore: ThredStore): Promise<ConditionResult | undefined> {
    const context = thredStore.thredContext;
    if (await this.expression.apply({ event, context })) {
      return this.asConditionResult();
    }
  }

  // First Condition in a Pattern must NOT apply side-effects because of the test method!
  async test(event: Event, context: ThredContext): Promise<boolean> {
    return !!(await this.expression.apply({ event, context }));
  }
}
