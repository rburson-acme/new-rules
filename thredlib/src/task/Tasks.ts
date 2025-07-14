import { EventTask, EventTaskParams } from '../core/Event.js';

export class Tasks {
  static getTaskParams(task: EventTask): EventTaskParams | undefined {
    return task?.params;
  }

  static getTaskValues(task: EventTask): Record<string, any> | Record<string, any>[] | undefined {
    return task?.params?.values;
  }

  static getTaskType(task: EventTask): string | undefined {
    return task?.params?.type;
  }

  static getTaskName(task: EventTask): string | undefined {
    return task?.name;
  }

  static getTaskOp(task: EventTask): string | undefined {
    return task?.op;
  }

  static getTaskOptions(task: EventTask): Record<string, any> | undefined {
    return task?.options;
  }

  static getTaskMatcher(task: EventTask): Record<string, any> | undefined {
    return task?.params?.matcher;
  }

  static getTaskSelector(task: EventTask): { include?: string[]; exclude?: string[] } | undefined {
    return task?.params?.selector;
  }

  static getTaskCollector(task: EventTask): EventTaskParams['collector'] | undefined {
    return task?.params?.collector;
  }

  static getTaskSort(task: EventTask): { readonly field: string; readonly desc?: boolean }[] | undefined {
    return task?.params?.collector?.sort;
  }

  static getTaskLimit(task: EventTask): number | undefined {
    return task?.params?.collector?.limit;
  }

  static getTaskSkip(task: EventTask): number | undefined {
    return task?.params?.collector?.skip;
  }
}
