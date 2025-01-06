
/**
 * Defines the persistence language constants, etc.
 */
export class Spec {

    /*
      Supported Operations
    */
    static readonly PUT_OP = 'put';
    static readonly GET_ONE_OP = 'getOne';
    static readonly GET_OP = 'get';
    static readonly UPDATE_OP = 'update';
    static readonly UPSERT_OP = 'upsert';
    static readonly REPLACE_OP = 'replace';
    static readonly DELETE_OP = 'delete';
    static readonly COUNT_OP = 'count';
    static readonly RUN_OP = 'run';

    static readonly OPERATOR_PREFIX = '$';
    /*
      Update Ops
    */
    static readonly ADD_OP = Spec.OPERATOR_PREFIX + 'add';
    static readonly REMOVE_OP = Spec.OPERATOR_PREFIX + 'remove';
    static readonly NOW_OP = Spec.OPERATOR_PREFIX + 'now';
    static readonly INC_OP = Spec.OPERATOR_PREFIX + 'inc';
    static readonly MIN_OP = Spec.OPERATOR_PREFIX + 'min';
    static readonly MAX_OP = Spec.OPERATOR_PREFIX + 'max';
    static readonly MUL_OP = Spec.OPERATOR_PREFIX + 'mul';

    /*
      Match Ops
    */
    static readonly OR_OP = Spec.OPERATOR_PREFIX + 'or';
    static readonly NOT_OP = Spec.OPERATOR_PREFIX + 'not';
    static readonly IN_OP = Spec.OPERATOR_PREFIX + 'in';
    static readonly NIN_OP = Spec.OPERATOR_PREFIX + 'nin';
    static readonly GTE_OP = Spec.OPERATOR_PREFIX + 'gte';
    static readonly GT_OP = Spec.OPERATOR_PREFIX + 'gt';
    static readonly LTE_OP = Spec.OPERATOR_PREFIX + 'lte';
    static readonly LT_OP = Spec.OPERATOR_PREFIX + 'lt';
    static readonly NE_OP = Spec.OPERATOR_PREFIX + 'ne';

    /*
      Query options 
    */
    static readonly SKIP = "skip";
    static readonly LIMIT = "limit";
    static readonly MULTI = "multi";
    static readonly IDS_ONLY = "ids_only";


    /* All enities have these */
    static readonly ID = 'id';
    static readonly CREATED = 'created';
    static readonly MODIFIED = 'modified';

}