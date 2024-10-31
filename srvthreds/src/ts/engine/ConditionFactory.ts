import { StringMap } from '../thredlib/index.js';
import { ConditionModel } from '../thredlib/index.js';
import { AndCondition } from './AndCondition.js';
import { Condition } from './Condition.js';
import { Filter } from './Filter.js';
import { OrCondition } from './OrCondition.js';

export class ConditionFactory {

    static typeMap: StringMap<any> = {
        "and": AndCondition,
        "or": OrCondition,
        "filter": Filter
    };

    private conditionId: number = 0;

    newCondition(conditionModel: ConditionModel): Condition {
        const type = ConditionFactory.typeMap[conditionModel.type];
        if (!type) throw Error(`Invalid Condition type: ${conditionModel.type}`);
        return new type(conditionModel, this);
    }

    get nextId():number {
        return this.conditionId++;
    }
}