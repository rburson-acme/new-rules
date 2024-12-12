import { ReactionModel } from '../thredlib/index.js';
import { Condition } from './Condition.js';
import { ConditionFactory } from './ConditionFactory.js';
import { ThredContext } from './ThredContext.js';
import { Event } from '../thredlib/index.js';
import { Message } from '../thredlib/index.js';
import { Transition } from './Transition.js';
import { ThredStore } from './store/ThredStore.js';
import { PermissionModel } from '../thredlib/model/PermissionModel.js';
import { Permissions } from './Permissions.js';

export type ReactionResult = { message?: Message, transition?: Transition };

/*
    @IMPORTANT any mutations here must be made in the Store
    This is part of the 'stateless' tree that gets shared across processes
*/
export class Reaction {

    readonly name: string;
    readonly condition: Condition;
    readonly permissions?: Permissions;
    readonly expiry?: {
        interval: number;
        transition?: Transition;
    }
    constructor(reactionModel: ReactionModel, name: string) {
        const { condition } = reactionModel;
        this.name = name;
        this.condition = new ConditionFactory().newCondition(condition, '0');
        if(reactionModel.expiry) {
            const { interval, transition: transitionModel } = reactionModel.expiry;
            const transition = transitionModel ? new Transition(transitionModel) : undefined;
            this.expiry = { interval,  transition };
        }
        if(reactionModel.permissions) this.permissions = new Permissions(reactionModel.permissions);
    }

    // @TODO - catch failures here and notify admin and relevant participant(s)
    async apply(event: Event, thredStore: ThredStore): Promise<ReactionResult | undefined> {
        const { condition } = this;
        const result = await condition.apply(event, thredStore );
        if (result) {
            const { transform, publish, transition } = result;
            const newEvent = await transform?.apply(event, thredStore);
            const to = await publish?.apply(event, thredStore);
            const message = to && newEvent ? { event: newEvent, to, id: newEvent.id } : undefined;
            return { message, transition };
        }
    }

    async test(event: Event, context: ThredContext): Promise<boolean> {
        return this.condition.test(event, context);
    }
}