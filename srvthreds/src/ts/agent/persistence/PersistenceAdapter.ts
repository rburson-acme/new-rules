import { Persistence } from '../../persistence/Persistence';
import { EventTask, Series, Event, errorCodes, errorKeys, EventValues } from '../../thredlib';
import { EventThrowable } from '../../thredlib/core/Errors';
import { Spec } from '../../thredlib/task/Spec';
import { Adapter } from '../adapter/Adapter';

export class PersistenceAdapter implements Adapter {
  constructor(private persistence: Persistence) {}

  async initialize(): Promise<void> {
    await this.persistence.connect();
  }

  async execute(event: Event): Promise<EventValues['values']> {
    const content = event.data?.content;
    if (!content?.tasks)
      throw EventThrowable.get(
        'No tasks provided for Persistence operation',
        errorCodes[errorKeys.MISSING_ARGUMENT_ERROR].code,
      );
    // tasks is an array containing tasks and/or arrays of tasks
    // A task array represents a transaction
    return Series.map(content.tasks, async (task: EventTask | EventTask[]) => {
      if (Array.isArray(task)) {
        // @TODO this represents a transaction - need to implment transaction handling in Persistence
        return Series.map(task, async (subTask) => {
          return this.executeTask(subTask);
        });
      } else {
        return await this.executeTask(task);
      }
    });
  }

  async executeTask(task: EventTask): Promise<any> {
    const { name, op, params } = task;
    if (!params) return;
    const { type, matcher, values, selector } = params;
    switch (op) {
      case Spec.PUT_OP:
        return this.persistence.put({ type, values });
      case Spec.GET_ONE_OP:
        return this.persistence.getOne({ type, matcher, selector });
      case Spec.GET_OP:
        return this.persistence.get({ type, matcher });
      case Spec.UPDATE_OP:
        return this.persistence.update({ type, matcher, values });
      case Spec.UPSERT_OP:
        return this.persistence.upsert({ type, matcher, values });
      case Spec.REPLACE_OP:
        return this.persistence.replace({ type, matcher, values });
      case Spec.DELETE_OP:
        return this.persistence.delete({ type, matcher });
      case Spec.COUNT_OP:
        return this.persistence.count({ type, matcher });
      case Spec.RUN_OP: 
        return this.persistence.run(values);
      default:
        throw new Error(`Unsupported task operation: ${task.op}`);
    }
  }
}
