import { ConditionModel } from './ConditionModel.js';
export interface FilterModel extends ConditionModel {
    xpr: string;
}
