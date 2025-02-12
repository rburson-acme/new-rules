import { ConditionModel, Logger } from '../thredlib/index.js';
import { ThredContext } from './ThredContext.js';
import { Event } from '../thredlib/index.js';
import { Publish } from './Publish.js';
import { Transform } from './Transform.js';
import { Transition } from './Transition.js';
import { ThredStore } from './store/ThredStore.js';
import { ConditionFactory } from './ConditionFactory.js';
import { Consequent } from './Consequent.js';

const { debug, logObject, error, h2 } = Logger;

export type ConditionResult = {
  transform?: Transform | undefined;
  publish?: Publish | undefined;
  transition?: Transition | undefined;
};
/*
    @IMPORTANT any mutations here must be made in the Store
    This is part of the 'stateless' tree that gets shared across processes
*/
export abstract class Condition {
  readonly conditionId: string;
  transform?: Transform;
  onTrue?: Consequent;
  publish?: Publish;
  transition?: Transition;

  //conditionId is only unique with a Reaction
  constructor(conditionModel: ConditionModel, conditionFactory: ConditionFactory, id: string) {
    this.conditionId = id;
    const { transform, onTrue, publish, transition } = conditionModel;
    this.transform = transform && new Transform(transform);
    this.onTrue = onTrue && new Consequent(onTrue);
    this.publish = publish && new Publish(publish);
    this.transition = transition && new Transition(transition);
  }

  // returns a result if the condition is satisfied, otherwise returns undefined
  async apply(event: Event, thredStore: ThredStore): Promise<ConditionResult | undefined> {
    const result = await this.applyCondition(event, thredStore);
    result && this.onTrue && (await this.onTrue.apply(event, thredStore));
    result
      ? debug(h2(`${this.constructor.name} for thredId: ${thredStore.id} MATCHED event: ${event.id}`))
      : debug(h2(`${this.constructor.name} for thredId: ${thredStore.id} DID NOT match event: ${event.id}`));
    return result;
  }
  protected abstract applyCondition(event: Event, thredStore: ThredStore): Promise<ConditionResult | undefined>;

  abstract test(event: Event, context: ThredContext): Promise<boolean>;

  // return an object for merging that contains any values that exist on this condition
  protected asConditionResult() {
    const result: ConditionResult = {};
    this.transform && (result.transform = this.transform);
    this.publish && (result.publish = this.publish);
    this.transition && (result.transition = this.transition);
    return result;
  }
}
