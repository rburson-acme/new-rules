export var ThredStatus;
(function (ThredStatus) {
    ThredStatus["ACTIVE"] = "a";
    // note finished is also and 'active' thred
    ThredStatus["FINISHED"] = "f";
    // these are considered 'archived' threds
    ThredStatus["TERMINATED"] = "t";
})(ThredStatus || (ThredStatus = {}));
