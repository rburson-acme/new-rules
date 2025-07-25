/**
 * Defines the persistence language constants, etc.
 */
export class Operations {
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
    static ADD_OP = Operations.OPERATOR_PREFIX + 'add';
    static REMOVE_OP = Operations.OPERATOR_PREFIX + 'remove';
    static NOW_OP = Operations.OPERATOR_PREFIX + 'now';
    static INC_OP = Operations.OPERATOR_PREFIX + 'inc';
    static MIN_OP = Operations.OPERATOR_PREFIX + 'min';
    static MAX_OP = Operations.OPERATOR_PREFIX + 'max';
    static MUL_OP = Operations.OPERATOR_PREFIX + 'mul';
    /*
      Match Ops
    */
    static OR_OP = Operations.OPERATOR_PREFIX + 'or';
    static NOT_OP = Operations.OPERATOR_PREFIX + 'not';
    static IN_OP = Operations.OPERATOR_PREFIX + 'in';
    static NIN_OP = Operations.OPERATOR_PREFIX + 'nin';
    static GTE_OP = Operations.OPERATOR_PREFIX + 'gte';
    static GT_OP = Operations.OPERATOR_PREFIX + 'gt';
    static LTE_OP = Operations.OPERATOR_PREFIX + 'lte';
    static LT_OP = Operations.OPERATOR_PREFIX + 'lt';
    static NE_OP = Operations.OPERATOR_PREFIX + 'ne';
    static MATCH_OP = Operations.OPERATOR_PREFIX + 're';
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
