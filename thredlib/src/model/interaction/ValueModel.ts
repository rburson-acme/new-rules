import { ElementModel } from './ElementModel.js';

export interface ValueModel extends ElementModel {
  forInput: string;
  display: string;
  set: Array<any>; 
}
