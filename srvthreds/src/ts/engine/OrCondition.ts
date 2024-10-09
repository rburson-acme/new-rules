import { ConditionModel, Series } from '../thredlib/index.js';
import { Condition, ConditionResult } from './Condition.js';
import { ConditionFactory } from './ConditionFactory.js';
import { ThredContext } from './ThredContext.js';
import { Event } from '../thredlib/index.js';
import { ThredStore } from './store/ThredStore.js';

/*
    @IMPORTANT any mutations here must be made in the Store
    This is part of the 'stateless' tree that gets shared across processes
*/
export class OrCondition extends Condition {
  private readonly operands: Condition[];

  constructor(conditionModel: ConditionModel, conditionFactory: ConditionFactory) {
    super(conditionModel, conditionFactory);
    this.operands = conditionModel?.operands?.map((operand) => conditionFactory.newCondition(operand)) || [];
  }

  /*
        First matching condition is selected.
        Any transform/publish/transition directives on the matching operand will be carried up and will override any at 'this' level
        i.e. 'deepest one wins'
    */
  async applyCondition(event: Event, thredStore: ThredStore): Promise<ConditionResult | undefined> {
    let operandResult: ConditionResult | undefined;
    await Series.some(this.operands, async (operand) => {
      operandResult = await operand.apply(event, thredStore);
      return !!operandResult;
    });
    if (operandResult) {
      const result = this.asConditionResult();
      return { ...result, ...operandResult };
    }
  }

  // pass if it matches any operand
  async test(event: Event, context: ThredContext): Promise<boolean> {
    return Series.some(this.operands, async (operand) => await operand.test(event, context));
  }
}
