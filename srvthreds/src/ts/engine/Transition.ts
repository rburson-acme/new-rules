import { TransitionModel, TransitionInput, Event } from '../thredlib/index.js';
import { ThredContext } from './ThredContext.js';

/*
    @IMPORTANT any mutations here must be made in the Store
    This is part of the 'stateless' tree that gets shared across processes
*/
export class Transition {

    static NEXT = '$next';
    static TERMINATE = '$terminate';
    static NO_TRANSITION = '$noTransition';

    readonly name: string;
    readonly input: TransitionInput;
    readonly localName?: string;

    constructor(transition: TransitionModel) {
        this.name = transition.name;
        this.input = transition.input || 'default';
        this.localName = transition.localName;
    }

    get forwardInputType(): boolean {
        return this.input === 'forward';
    }

    get localInputType(): boolean {
        return this.input === 'local';
    }

    nextInputEvent(thredContext: ThredContext, currentEvent?: Event): Event | undefined {
        if (this.forwardInputType) {
            return currentEvent;
        } else if (this.localInputType) {
            if(!this.localName) throw Error('Pattern Error: No localName defined for transition.input = local');
            return thredContext.getLocal(this.localName);
        }
        return undefined;
    }

}