import { Operations } from '../../thredlib/task/Operations.js';
import { EventTask, EventTaskParams, Id, StringMap } from '../../thredlib/index.js';

/**
 * For the 'translation' of WT persistence language to Mongodb querys
 */
export class MongoOperations {
  /*
    Mongodb defs 
  */

  static readonly _ID = '_id';
  static readonly SET_OP = '$set';

  static readonly INBOUND_FIELD_MAP: StringMap<any> = {
    [Operations.ID]: MongoOperations._ID,
  };

  static readonly MATCHER_FIELD_MAP: StringMap<any> = {
    [Operations.ID]: MongoOperations._ID,
    [Operations.GTE_OP]: '$gte',
    [Operations.LT_OP]: '$lt',
    [Operations.LTE_OP]: '$lte',
    [Operations.GT_OP]: '$gt',
    [Operations.NE_OP]: '$ne',
    [Operations.NOT_OP]: '$not',
    [Operations.MATCH_OP]: '$regex',

    //array operators
    [Operations.OR_OP]: '$or',
    [Operations.IN_OP]: '$in',
    [Operations.NIN_OP]: '$nin',
  };

  static readonly OUTBOUND_FIELD_MAP: StringMap<any> = {
    [MongoOperations._ID]: Operations.ID,
  };

  static readonly UPDATE_FIELD_MAP: StringMap<any> = {};

  static readonly UPDATE_OP_MAP: StringMap<any> = {
    [Operations.ADD_OP]: '$addToSet',
    [Operations.REMOVE_OP]: '$pull',
    [Operations.NOW_OP]: '$currentDate',
    [Operations.INC_OP]: '$inc',
    [Operations.MIN_OP]: '$min',
    [Operations.MAX_OP]: '$max',
    [Operations.MUL_OP]: '$mul',
  };

  static readonly INBOUND_FIELD_BLACKLIST = [MongoOperations._ID, Operations.CREATED, Operations.MODIFIED];
  static readonly UPDATE_FIELD_BLACKLIST = [...MongoOperations.INBOUND_FIELD_BLACKLIST, Operations.ID];
  static readonly MATCHER_FIELD_BLACKLIST = [];
  static readonly OUTBOUND_FIELD_BLACKLIST = [];

  static mapInputValues(values: StringMap<any> | Array<StringMap<any>>, replace?: boolean): any {
    if (Array.isArray(values)) {
      return values.map((value) => MongoOperations.mapInputValue(value, replace));
    }
    return MongoOperations.mapInputValue(values, replace);
  }

  static mapOutputValues(values: StringMap<any> | Array<StringMap<any>>): any {
    if (Array.isArray(values)) {
      return values.map(MongoOperations.mapOutputValue);
    }
    return MongoOperations.mapOutputValue(values);
  }

  static mapMatcherValues(value: StringMap<any>) {
    return MongoOperations.mapKeysRecursive({
      values: value,
      map: MongoOperations.MATCHER_FIELD_MAP,
      blacklist: MongoOperations.MATCHER_FIELD_BLACKLIST,
    });
  }

  // @TODO - use mongo operator $currentDate for setting the modified date
  static mapUpdateValues(value: StringMap<any>) {
    const mappedValues = MongoOperations.mapUpdateKeysRecursive({
      values: value,
      map: MongoOperations.UPDATE_FIELD_MAP,
      blacklist: MongoOperations.UPDATE_FIELD_BLACKLIST,
    });
    const values = mappedValues[MongoOperations.SET_OP] || {};
    const now = new Date();
    values[Operations.MODIFIED] = now;
    mappedValues[MongoOperations.SET_OP] = values;
    return mappedValues;
  }

  static mapSortValues(value: { field: string; desc?: boolean }[]) {
    return value.reduce((accum: StringMap<any>, item) => {
      const field =
        item.field in MongoOperations.INBOUND_FIELD_MAP ? MongoOperations.INBOUND_FIELD_MAP[item.field] : item.field;
      accum[field] = item.desc ? -1 : 1;
      return accum;
    }, {});
  }

  static mapSelectorValues(selector: EventTaskParams['selector']) {
    const result: StringMap<any> = {};
    selector?.include?.forEach((fieldName) => {
      result[fieldName] = 1;
    });
    selector?.exclude?.forEach((fieldName) => {
      result[fieldName] = 0;
    });
    return result;
  }

  // @TODO - use mongo operator $currentDate for setting these dates
  private static mapInputValue(value: StringMap<any>, replace?: boolean) {
    const mappedValues = MongoOperations.mapKeys({
      values: value,
      map: MongoOperations.INBOUND_FIELD_MAP,
      blacklist: MongoOperations.INBOUND_FIELD_BLACKLIST,
    });
    if (!replace && !mappedValues[MongoOperations._ID]) mappedValues[MongoOperations._ID] = Id.generate();
    const now = new Date();
    if (!replace) mappedValues[Operations.CREATED] = now;
    mappedValues[Operations.MODIFIED] = now;
    return mappedValues;
  }

  private static mapOutputValue(value: StringMap<any>) {
    return MongoOperations.mapKeys({
      values: value,
      map: MongoOperations.OUTBOUND_FIELD_MAP,
      blacklist: MongoOperations.OUTBOUND_FIELD_BLACKLIST,
    });
  }

  /*
    Translate (map) keys from one set to another, based on the given map
    Shallow copy suitable for mapping the acutal data - input values and output values
  */
  private static mapKeys(params: { values: StringMap<any>; map: StringMap<any>; blacklist: Array<string> }) {
    const { values, map, blacklist } = params;
    return Object.keys(values).reduce((accum: StringMap<any>, key: string) => {
      if (!blacklist.includes(key)) {
        if (key in map) {
          accum[map[key]] = values[key];
        } else {
          accum[key] = values[key];
        }
      }
      return accum;
    }, {});
  }

  /*
    @TODO - optimize this recursion with 'trampolining'

    Translate (map) keys from one set to another, based on the given map
    Deep copy suitable for translating the 'matchers' (queries) and 'update' objects
  */
  private static mapKeysRecursive(params: { values: any; map: StringMap<any>; blacklist: Array<string> }): any {
    const { values, map, blacklist } = params;

    if (values === undefined || values === null) return values;

    if (Array.isArray(values)) {
      return values.map((item) => MongoOperations.mapKeysRecursive({ ...params, values: item }));
    }

    if (typeof values === 'object') {
      return Object.keys(values).reduce((accum: StringMap<any>, key: string) => {
        if (!blacklist.includes(key)) {
          const resultValue = MongoOperations.mapKeysRecursive({ ...params, values: values[key] });
          if (key in map) {
            // add case insensitive option if this is a regex
            if (key === Operations.MATCH_OP) accum['$options'] = 'i';
            accum[map[key]] = resultValue;
          } else {
            accum[key] = resultValue;
          }
        }
        return accum;
      }, {});
    }

    return values;
  }

  // Our update format is slightly different than Mongos, so we have to do some map shifting...
  private static mapUpdateKeysRecursive(params: {
    values: StringMap<any>;
    map: StringMap<any>;
    blacklist: Array<string>;
  }) {
    const { values, map, blacklist } = params;
    if (values === undefined || values === null) return values;
    const fields: StringMap<any> = {};
    const operators: StringMap<any> = {};
    // seperate the field values from the operators
    Object.keys(values).forEach((key) => {
      if (key in MongoOperations.UPDATE_OP_MAP) {
        operators[MongoOperations.UPDATE_OP_MAP[key]] = values[key];
      } else {
        fields[key] = values[key];
      }
    });
    const result: StringMap<any> = { ...operators };
    if (Object.keys(fields).length > 0) {
      result[MongoOperations.SET_OP] = MongoOperations.mapKeysRecursive({ values: fields, map, blacklist });
    }
    return result;
  }
}
