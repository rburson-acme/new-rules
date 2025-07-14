export class Tasks {
    static getTaskParams(task) {
        return task?.params;
    }
    static getTaskValues(task) {
        return task?.params?.values;
    }
    static getTaskType(task) {
        return task?.params?.type;
    }
    static getTaskName(task) {
        return task?.name;
    }
    static getTaskOp(task) {
        return task?.op;
    }
    static getTaskOptions(task) {
        return task?.options;
    }
    static getTaskMatcher(task) {
        return task?.params?.matcher;
    }
    static getTaskSelector(task) {
        return task?.params?.selector;
    }
    static getTaskCollector(task) {
        return task?.params?.collector;
    }
    static getTaskSort(task) {
        return task?.params?.collector?.sort;
    }
    static getTaskLimit(task) {
        return task?.params?.collector?.limit;
    }
    static getTaskSkip(task) {
        return task?.params?.collector?.skip;
    }
}
