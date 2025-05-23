import { StringMap } from '../thredlib/index.js';
import { PatternModel } from '../thredlib/index.js';
import { ReactionModel } from '../thredlib/index.js';
import { ThredContext } from './ThredContext.js';
import { Event } from '../thredlib/index.js';
import { Reaction } from './Reaction.js';
import { Transition } from './Transition.js';

export class Pattern {
  readonly id: string;
  readonly name: string;
  // @todo needs impl - time required between creation of new threads 0 for none required
  readonly instanceInterval?: number;
  // @todo needs impl - number of simultaneous thred instances allowed (0 default no limit)
  readonly maxInstances?: number;
  readonly broadcastAllowed: boolean = false;
  private readonly reactionModelByName: StringMap<ReactionModel>;

  /*
        Uses supplied reaction name if any, uses index otherwise
        since a new Reaction instances must have a name
    */
  constructor(readonly patternModel: PatternModel) {
    this.name = patternModel.name;
    this.id = patternModel.id || Pattern.idFromName(this.name);
    this.instanceInterval = patternModel.instanceInterval;
    this.maxInstances = patternModel.maxInstances;
    this.broadcastAllowed = patternModel.broadcastAllowed === true;
    this.reactionModelByName = patternModel.reactions.reduce((accum: StringMap<ReactionModel>, reaction, index) => {
      const name = reaction.name ?? this.getReactionNameForIndex(index);
      if (accum[name]) throw Error('Reactions must have unique names (check for duplicates)');
      accum[name] = reaction;
      return accum;
    }, {});
  }

  static idFromName(name: string): string {
    return name.replace(' ', '_').toLowerCase();
  }

  async consider(event: Event, thredContext: ThredContext): Promise<boolean> {
    const { initialReaction } = this;
    if (!initialReaction) {
      throw Error(`No intial reaction found for pattern ${this.name}`);
    }
    return initialReaction.test(event, thredContext);
  }

  get initialReaction(): Reaction | undefined {
    const reactionModel = this.patternModel.reactions?.[0];
    if (reactionModel) {
      const name = reactionModel.name || this.getReactionNameForIndex(0);
      return new Reaction(reactionModel, name);
    }
  }

  get initialReactionName(): string {
    const reactionModel = this.patternModel.reactions?.[0];
    return reactionModel?.name || this.getReactionNameForIndex(0);
  }

  /*
        Return the next reaction based on transition name/or next item in the sequence
        otherwise, if terminate is specified, return undefined.  If no next reaction is specified
        return undefined. undefined is a signal to terminate the thred
    */
  nextReaction(currentReaction: Reaction | undefined, transition?: Transition): Reaction | undefined {
    if (!currentReaction) {
      return this.initialReaction;
    }
    const name = transition?.name;
    if (name && name !== Transition.NEXT) {
      if (name === Transition.TERMINATE) {
        return undefined;
      } else if (name === Transition.NO_TRANSITION) {
        return currentReaction;
      }
      const nextReactionModel = this.reactionModelByName[name];
      if (!nextReactionModel) throw Error(`nextReaction(): Reaction ${name} not found.`);
      return new Reaction(nextReactionModel, name);
    }
    // if no name or NEXT, we'll need to find the index of the next ReactionModel
    const currentReactionModel = this.reactionModelByName[currentReaction.name];
    const currentIndex = this.patternModel.reactions.indexOf(currentReactionModel);
    const nextReactionModel = this.patternModel.reactions?.[currentIndex + 1];
    if (nextReactionModel) {
      const name = nextReactionModel.name || this.getReactionNameForIndex(currentIndex + 1);
      return new Reaction(nextReactionModel, name);
    }
    return undefined;
  }

  reactionByName(name: string): Reaction {
    const nextReactionModel = this.reactionModelByName[name];
    if (!nextReactionModel) throw Error(`nextReaction(): Reaction ${name} not found.`);
    return new Reaction(nextReactionModel, name);
  }

  private getReactionNameForIndex(index: number) {
    return `${this.name}_${index}`;
  }
}
