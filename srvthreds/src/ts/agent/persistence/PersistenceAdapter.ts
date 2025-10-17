import { Persistence } from '../../persistence/Persistence.js';
import { PersistenceFactory } from '../../persistence/PersistenceFactory.js';
import { Transaction } from '../../persistence/Transaction.js';
import { EventTask, Series, Event, errorCodes, errorKeys, EventValues } from '../../thredlib/index.js';
import { EventThrowable } from '../../thredlib/core/Errors.js';
import { Operations } from '../../thredlib/task/Operations.js';
import { Adapter } from '../adapter/Adapter.js';

export class PersistenceAdapter implements Adapter {
  constructor(private config?: { hostString?: string; dbname?: string; directConnection?: boolean }) {}

  async initialize(): Promise<void> {
    // nothing to initialize here
    // the persistence factory will handle the connection when an instance is created
  }

  // @TODO implement transactions for Persistence
  async execute(event: Event): Promise<EventValues['values']> {
    const content = event.data?.content;
    if (!content?.tasks)
      throw EventThrowable.get({
        message: 'No tasks provided for Persistence operation',
        code: errorCodes[errorKeys.MISSING_ARGUMENT_ERROR].code,
      });
    // tasks is an array containing tasks and/or arrays of tasks
    // A task array represents a transaction
    return Series.map(content.tasks, async (task: EventTask | EventTask[]) => {
      // if the task is an array, it represents a transaction
      // Note: A set of tasks with different hosts or dbnames are not supported in a transaction
      if (Array.isArray(task) && task.length) {
        this.checkTasksForValidTransaction(task as EventTask[]);
        const persistence = this.getPersistence(task[0]);
        const transaction = persistence.newTransaction();
        await transaction.start();
        try {
          const results = await Series.map(task, async (subTask) => {
            return this.executeTask(subTask, persistence, transaction);
          });
          await transaction.commit();
          return results;
        } catch (e) {
          transaction.rollback();
          throw e;
        }
      } else {
        // single task, execute it directly
        return await this.executeTask(task as EventTask, this.getPersistence(task as EventTask));
      }
    });
  }

  async executeTask(task: EventTask, persistence: Persistence, transaction?: Transaction): Promise<any> {
    const options = transaction ? { transaction } : undefined;
    const { name, op, params } = task;
    if (!params) return;
    const { type, matcher, values, selector, collector } = params;
    switch (op) {
      case Operations.PUT_OP:
        return persistence.put({ type, values }, options);
      case Operations.GET_ONE_OP:
        return persistence.getOne({ type, matcher, selector, collector }, options);
      case Operations.GET_OP:
        return persistence.get({ type, matcher, selector, collector }, options);
      case Operations.UPDATE_OP:
        return persistence.update({ type, matcher, values }, options);
      case Operations.UPSERT_OP:
        return persistence.upsert({ type, matcher, values }, options);
      case Operations.REPLACE_OP:
        return persistence.replace({ type, matcher, values }, options);
      case Operations.DELETE_OP:
        return persistence.delete({ type, matcher }, options);
      case Operations.COUNT_OP:
        return persistence.count({ type, matcher }, options);
      case Operations.RUN_OP:
        return persistence.run(values);
      default:
        throw new Error(`Unsupported task operation: ${task.op}`);
    }
  }
  private getPersistence(task: EventTask): Persistence {
    // task options can override the adapter config with host and dbname
    const dbname = task?.options?.dbname || this.config?.dbname;
    const hostString = task?.options?.hostString || this.config?.hostString;
    const directConnection = task?.options?.directConnection ?? this.config?.directConnection;
    return PersistenceFactory.getPersistence({ hostString, dbname, directConnection });
  }

  private checkTasksForValidTransaction(tasks: EventTask[]): boolean {
    if (!tasks || tasks.length === 0) return true;
    const firstDbName = tasks[0]?.options?.dbname;
    const firstHostString = tasks[0]?.options?.hostString;
    for (const task of tasks) {
      if (task?.options?.dbname !== firstDbName || task?.options?.hostString !== firstHostString) {
        throw EventThrowable.get({
          message: 'All tasks in a transaction must have the same host and dbname',
          code: errorCodes[errorKeys.ARGUMENT_VALIDATION_ERROR].code,
        });
      }
    }
    return true;
  }
}
