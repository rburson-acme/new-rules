/**
 * Defines the persistence language constants, etc.
 */
export class Spec {
    /*
      Supported Operations
    */
    static PUT_OP = 'put';
    static GET_ONE_OP = 'getOne';
    static GET_OP = 'get';
    static UPDATE_OP = 'update';
    static UPSERT_OP = 'upsert';
    static REPLACE_OP = 'replace';
    static DELETE_OP = 'delete';
    static COUNT_OP = 'count';
    static RUN_OP = 'run';
    static OPERATOR_PREFIX = '$';
    /*
      Update Ops
    */
    static ADD_OP = Spec.OPERATOR_PREFIX + 'add';
    static REMOVE_OP = Spec.OPERATOR_PREFIX + 'remove';
    static NOW_OP = Spec.OPERATOR_PREFIX + 'now';
    static INC_OP = Spec.OPERATOR_PREFIX + 'inc';
    static MIN_OP = Spec.OPERATOR_PREFIX + 'min';
    static MAX_OP = Spec.OPERATOR_PREFIX + 'max';
    static MUL_OP = Spec.OPERATOR_PREFIX + 'mul';
    /*
      Match Ops
    */
    static OR_OP = Spec.OPERATOR_PREFIX + 'or';
    static NOT_OP = Spec.OPERATOR_PREFIX + 'not';
    static IN_OP = Spec.OPERATOR_PREFIX + 'in';
    static NIN_OP = Spec.OPERATOR_PREFIX + 'nin';
    static GTE_OP = Spec.OPERATOR_PREFIX + 'gte';
    static GT_OP = Spec.OPERATOR_PREFIX + 'gt';
    static LTE_OP = Spec.OPERATOR_PREFIX + 'lte';
    static LT_OP = Spec.OPERATOR_PREFIX + 'lt';
    static NE_OP = Spec.OPERATOR_PREFIX + 'ne';
    static MATCH_OP = Spec.OPERATOR_PREFIX + 're';
    /*
      Query options
    */
    static SKIP = "skip";
    static LIMIT = "limit";
    static MULTI = "multi";
    static IDS_ONLY = "ids_only";
    /* All enities have these */
    static ID = 'id';
    static CREATED = 'created';
    static MODIFIED = 'modified';
}
