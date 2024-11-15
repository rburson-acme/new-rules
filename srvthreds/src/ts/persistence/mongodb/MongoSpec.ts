import { Spec } from "../Spec.js";
import { StringMap } from '../../thredlib/index.js';

/**
 * For the 'translation' of WT persistence language to Mongodb querys
 */
export class MongoSpec {

  /*
    Mongodb defs 
  */

  static readonly _ID = '_id';
  static readonly SET_OP = '$set';

  static readonly INBOUND_FIELD_MAP: StringMap<any> = {
    [Spec.ID]: MongoSpec._ID
  }

  static readonly MATCHER_FIELD_MAP: StringMap<any> = {
    [Spec.ID]: MongoSpec._ID,
    [Spec.GTE_OP]: '$gte',
    [Spec.LT_OP]: '$lt',
    [Spec.LTE_OP]: '$lte',
    [Spec.GT_OP]: '$gt',
    [Spec.NE_OP]: '$ne',
    [Spec.NOT_OP]: '$not',

    //array operators
    [Spec.OR_OP]: '$or',
    [Spec.IN_OP]: '$in',
    [Spec.NIN_OP]: '$nin'
  }

  static readonly OUTBOUND_FIELD_MAP: StringMap<any> = {
    [MongoSpec._ID]: Spec.ID
  }

  static readonly UPDATE_FIELD_MAP: StringMap<any> = {
  }

  static readonly UPDATE_OP_MAP: StringMap<any> = {
    [Spec.ADD_OP]: '$addToSet',
    [Spec.REMOVE_OP]: '$pull',
    [Spec.NOW_OP]: '$currentDate',
    [Spec.INC_OP]: '$inc',
    [Spec.MIN_OP]: '$min',
    [Spec.MAX_OP]: '$max',
    [Spec.MUL_OP]: '$mul',
  }

  static readonly INBOUND_FIELD_BLACKLIST = [MongoSpec._ID, Spec.CREATED, Spec.MODIFIED];
  static readonly UPDATE_FIELD_BLACKLIST = [...MongoSpec.INBOUND_FIELD_BLACKLIST];
  static readonly MATCHER_FIELD_BLACKLIST = [];
  static readonly OUTBOUND_FIELD_BLACKLIST = [];

  static mapInputValues(values: StringMap<any> | Array<StringMap<any>>): any {
    if (Array.isArray(values)) {
      return values.map(MongoSpec.mapInputValue);
    }
    return MongoSpec.mapInputValue(values);
  }

  static mapOutputValues(values: StringMap<any> | Array<StringMap<any>>): any {
    if (Array.isArray(values)) {
      return values.map(MongoSpec.mapOutputValue);
    }
    return MongoSpec.mapOutputValue(values);
  }

  static mapMatcherValues(value: StringMap<any>) {
    return MongoSpec.mapKeysRecursive({ values: value, map: MongoSpec.MATCHER_FIELD_MAP, blacklist: MongoSpec.MATCHER_FIELD_BLACKLIST });
  }

  // @TODO - use mongo operator $currentDate for setting the modified date
  static mapUpdateValues(value: StringMap<any>) {
    const mappedValues = MongoSpec.mapUpdateKeysRecursive({ values: value, map: MongoSpec.UPDATE_FIELD_MAP, blacklist: MongoSpec.UPDATE_FIELD_BLACKLIST })
    const values = mappedValues[MongoSpec.SET_OP] || {};
    const now = new Date();
    values[Spec.MODIFIED] = now;
    mappedValues[MongoSpec.SET_OP] = values;
    return mappedValues;
  }

  // @TODO - use mongo operator $currentDate for setting these dates
  private static mapInputValue(value: StringMap<any>) {
    const mappedValues = MongoSpec.mapKeys({ values: value, map: MongoSpec.INBOUND_FIELD_MAP, blacklist: MongoSpec.INBOUND_FIELD_BLACKLIST });
    const now = new Date();
    mappedValues[Spec.CREATED] = now;
    mappedValues[Spec.MODIFIED] = now;
    return mappedValues;
  }

  private static mapOutputValue(value: StringMap<any>) {
    return MongoSpec.mapKeys({ values: value, map: MongoSpec.OUTBOUND_FIELD_MAP, blacklist: MongoSpec.OUTBOUND_FIELD_BLACKLIST });
  }

  /*
    Translate (map) keys from one set to another, based on the given map
    Shallow copy suitable for mapping the acutal data - input values and output values
  */
  private static mapKeys(params: { values: StringMap<any>, map: StringMap<any>, blacklist: Array<string> }) {
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
  private static mapKeysRecursive(params: { values: any, map: StringMap<any>, blacklist: Array<string> }): any {

    const { values, map, blacklist } = params;

    if (values === undefined || values === null) return values;

    if (Array.isArray(values)) {
      return values.map(item => MongoSpec.mapKeysRecursive({ ...params, values: item }));
    }

    if (typeof values === 'object') {
      return Object.keys(values).reduce((accum: StringMap<any>, key: string) => {
        if (!blacklist.includes(key)) {
          const resultValue = MongoSpec.mapKeysRecursive({ ...params, values: values[key] });
          if (key in map) {
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
  private static mapUpdateKeysRecursive(params: { values: StringMap<any>, map: StringMap<any>, blacklist: Array<string> }) {
    const { values, map, blacklist } = params;
    if (values === undefined || values === null) return values;
    const fields: StringMap<any> = {};
    const operators: StringMap<any> = {};
    // seperate the field values from the operators
    Object.keys(values).forEach((key) => {
      if(key in MongoSpec.UPDATE_OP_MAP) {
        operators[MongoSpec.UPDATE_OP_MAP[key]] = values[key];
      } else {
        fields[key] = values[key];
      }
    });
    const result: StringMap<any> = { ...operators };
    if(Object.keys(fields).length > 0) {
      result[MongoSpec.SET_OP] = MongoSpec.mapKeysRecursive( { values: fields, map, blacklist })
    }
    return result;
  }






}