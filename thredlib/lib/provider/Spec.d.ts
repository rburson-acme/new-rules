/**
 * Defines the persistence language constants, etc.
 */
export declare class Spec {
    static readonly PUT_OP = "put";
    static readonly GET_ONE_OP = "getOne";
    static readonly GET_OP = "get";
    static readonly UPDATE_OP = "update";
    static readonly UPSERT_OP = "upsert";
    static readonly REPLACE_OP = "replace";
    static readonly DELETE_OP = "delete";
    static readonly COUNT_OP = "count";
    static readonly RUN_OP = "run";
    static readonly OPERATOR_PREFIX = "$";
    static readonly ADD_OP: string;
    static readonly REMOVE_OP: string;
    static readonly NOW_OP: string;
    static readonly INC_OP: string;
    static readonly MIN_OP: string;
    static readonly MAX_OP: string;
    static readonly MUL_OP: string;
    static readonly OR_OP: string;
    static readonly NOT_OP: string;
    static readonly IN_OP: string;
    static readonly NIN_OP: string;
    static readonly GTE_OP: string;
    static readonly GT_OP: string;
    static readonly LTE_OP: string;
    static readonly LT_OP: string;
    static readonly NE_OP: string;
    static readonly SKIP = "skip";
    static readonly LIMIT = "limit";
    static readonly MULTI = "multi";
    static readonly IDS_ONLY = "ids_only";
    static readonly ID = "id";
    static readonly CREATED = "created";
    static readonly MODIFIED = "modified";
}
