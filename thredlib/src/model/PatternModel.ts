import { ReactionModel } from './ReactionModel.js';

export interface PatternModel {
   
    id?: string;
    name: string;
    description?: string;
    instanceInterval: number,
    multiInstance: number,
    reactions: ReactionModel[];

}