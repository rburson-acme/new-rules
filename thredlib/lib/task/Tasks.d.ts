import { EventTask, EventTaskParams } from '../core/Event.js';
export declare class Tasks {
    static getTaskParams(task: EventTask): EventTaskParams | undefined;
    static getTaskValues(task: EventTask): Record<string, any> | Record<string, any>[] | undefined;
    static getTaskType(task: EventTask): string | undefined;
    static getTaskName(task: EventTask): string | undefined;
    static getTaskOp(task: EventTask): string | undefined;
    static getTaskOptions(task: EventTask): Record<string, any> | undefined;
    static getTaskMatcher(task: EventTask): Record<string, any> | undefined;
    static getTaskSelector(task: EventTask): {
        include?: string[];
        exclude?: string[];
    } | undefined;
    static getTaskCollector(task: EventTask): EventTaskParams['collector'] | undefined;
    static getTaskSort(task: EventTask): {
        readonly field: string;
        readonly desc?: boolean;
    }[] | undefined;
    static getTaskLimit(task: EventTask): number | undefined;
    static getTaskSkip(task: EventTask): number | undefined;
}
