import { Persistent } from '../persistence/Persistent.js';
import { ReactionModel } from './ReactionModel.js';

export interface PatternModel extends Persistent {
  
    id?: string;
    name: string;
    description?: string;
    instanceInterval: number,
    maxInstances: number,
    reactions: ReactionModel[];

}