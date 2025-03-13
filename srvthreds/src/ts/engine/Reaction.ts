import { Address, Logger, ReactionModel } from '../thredlib/index.js';
import { Condition } from './Condition.js';
import { ConditionFactory } from './ConditionFactory.js';
import { ThredContext } from './ThredContext.js';
import { Event } from '../thredlib/index.js';
import { Transition } from './Transition.js';
import { ThredStore } from './store/ThredStore.js';
import { Permissions } from './Permissions.js';
import { MessageTemplate } from './MessageTemplate.js';

export type ReactionResult = { messageTemplate?: MessageTemplate, transition?: Transition };

/*
    @IMPORTANT any mutations here must be made in the Store
    This is part of the 'stateless' tree that gets shared across processes
*/
export class Reaction {
  readonly name: string;
  readonly condition: Condition;
  readonly allowedSources?: string[] | string;
  readonly permissions?: Permissions;
  readonly expiry?: {
    interval: number;
    transition?: Transition;
  };
  constructor(reactionModel: ReactionModel, name: string) {
    const { condition } = reactionModel;
    this.name = name;
    this.condition = new ConditionFactory().newCondition(condition, '0');
    if (reactionModel.expiry) {
      const { interval, transition: transitionModel } = reactionModel.expiry;
      const transition = transitionModel ? new Transition(transitionModel) : undefined;
      this.expiry = { interval, transition };
    }
    this.allowedSources = reactionModel.allowedSources;
    if (reactionModel.permissions) this.permissions = new Permissions(reactionModel.permissions);
  }

  // @TODO - catch failures here and notify admin and relevant participant(s)
  async apply(event: Event, thredStore: ThredStore): Promise<ReactionResult | undefined> {
    if(!this.authorize(event)) return undefined;
    const { condition } = this;
    const result = await condition.apply(event, thredStore);
    if (result) {
      const { transform, publish, transition } = result;
      const newEvent = await transform?.apply(event, thredStore);
      const to = await publish?.apply(event, thredStore);
      const messageTemplate = to && newEvent ? { event: newEvent, to } : undefined;
      return { messageTemplate, transition };
    }
  }

  async test(event: Event, context: ThredContext): Promise<boolean> {
    if(!this.authorize(event)) return false;
    return this.condition.test(event, context);
  }


  // @TODO - need to queue exceptions and deliver to appropriate participants
  private authorize(event: Event): boolean {
    // @TODO - allow Groups for allowedSources
    // @TODO - allow expression / regex for allowedSources
    if (this.allowedSources) {
      const source = event.source.id;
      if (Array.isArray(this.allowedSources)) {
        if (!this.allowedSources.includes(source)) {
          Logger.debug(Logger.h2(`Event source ${source} not in allowed sources ${this.allowedSources}`));
          return false;
        }
      } else if (this.allowedSources !== source) {
        Logger.debug(Logger.h2(`Event source ${source} not in allowed sources ${this.allowedSources}`));
        return false;
      }
    }
    return true;
    // @TODO - implement permissions
  }
}
