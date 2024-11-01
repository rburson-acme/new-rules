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
export class AndCondition extends Condition {
  // private operandResults: (ConditionResult | undefined)[];
  private operands: Condition[];

  constructor(conditionModel: ConditionModel, conditionFactory: ConditionFactory, id: string) {
    super(conditionModel, conditionFactory, id);
    const nextId = +id + 1;
    this.operands = conditionModel?.operands?.map((operand) => conditionFactory.newCondition(operand, `${nextId}`)) || [];
  }

  /*
        All operands must match once.
        Any transform/publish/transition directives on the operands will be carried up and will override any at 'this' level
        i.e. 'deepest one wins'
    */
  async applyCondition(event: Event, thredStore: ThredStore): Promise<ConditionResult | undefined> {
    const { reactionStore } = thredStore;
    const state = reactionStore.getConditionStateForId(this.conditionId);
    const operandResults: boolean[] = state?.operandResults || this.operands.map(() => false);
    const { operands } = this;
    await Series.forEach(operands, async (operand, index) => {
      if (!operandResults[index]) {
        const result: boolean = !!(await operand.apply(event, thredStore));
        if (result) {
          operandResults[index] = result;
        }
      }
    });
    reactionStore.setConditionStateFor(this.conditionId, { operandResults });
    if (operandResults.every((result) => result)) {
      return this.asConditionResult();
    }
  }

  // pass if it matches any operand
  async test(event: Event, context: ThredContext): Promise<boolean> {
    return Series.some(this.operands, async (operand) => await operand.test(event, context));
  }

}
