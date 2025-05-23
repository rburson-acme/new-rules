export var ThredLogRecordType;
(function (ThredLogRecordType) {
    // the associated event successfully matched a condition
    ThredLogRecordType["MATCH"] = "m";
    // the associated event did not match any condition
    ThredLogRecordType["NO_MATCH"] = "nm";
    // the associated event targeted a thred that does not or no longer exists
    ThredLogRecordType["NO_THRED"] = "nt";
    // the associated event did not match any pattern (no thred)
    ThredLogRecordType["NO_PATTERN_MATCH"] = "np";
})(ThredLogRecordType || (ThredLogRecordType = {}));
