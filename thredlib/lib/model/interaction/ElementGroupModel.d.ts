import { ElementModel } from './ElementModel.js';
export interface ElementGroupModel extends ElementModel {
    label: string;
    items: ElementModel[];
}
