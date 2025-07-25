
export type Operation = 'put' | 'getOne' | 'get' | 'update' | 'upsert' | 'replace' | 'delete' | 'count' | 'run';

/**
 * Defines the persistence language constants, etc.
 */
export class Operations {


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
    static readonly ADD_OP = Operations.OPERATOR_PREFIX + 'add';
    static readonly REMOVE_OP = Operations.OPERATOR_PREFIX + 'remove';
    static readonly NOW_OP = Operations.OPERATOR_PREFIX + 'now';
    static readonly INC_OP = Operations.OPERATOR_PREFIX + 'inc';
    static readonly MIN_OP = Operations.OPERATOR_PREFIX + 'min';
    static readonly MAX_OP = Operations.OPERATOR_PREFIX + 'max';
    static readonly MUL_OP = Operations.OPERATOR_PREFIX + 'mul';

    /*
      Match Ops
    */
    static readonly OR_OP = Operations.OPERATOR_PREFIX + 'or';
    static readonly NOT_OP = Operations.OPERATOR_PREFIX + 'not';
    static readonly IN_OP = Operations.OPERATOR_PREFIX + 'in';
    static readonly NIN_OP = Operations.OPERATOR_PREFIX + 'nin';
    static readonly GTE_OP = Operations.OPERATOR_PREFIX + 'gte';
    static readonly GT_OP = Operations.OPERATOR_PREFIX + 'gt';
    static readonly LTE_OP = Operations.OPERATOR_PREFIX + 'lte';
    static readonly LT_OP = Operations.OPERATOR_PREFIX + 'lt';
    static readonly NE_OP = Operations.OPERATOR_PREFIX + 'ne';
    static readonly MATCH_OP = Operations.OPERATOR_PREFIX + 're';

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