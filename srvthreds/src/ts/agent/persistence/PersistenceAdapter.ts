import { Persistence } from '../../persistence/Persistence';
import { EventContent, EventTask, EventTasks, Series } from '../../thredlib';
import { Adapter } from '../adapter/Adapter';

export class PersistenceAdapter implements Adapter {
  constructor(private persistence: Persistence) {}

  async initialize(): Promise<void> {
    await this.persistence.connect();
  }

  async execute(content?: EventContent): Promise<any> {
    if (!content?.tasks) return;
    // tasks is an array containing tasks and/or arrays of tasks
    // A task array represents a transaction
    return Series.map(content.tasks, async (task: EventTask | EventTask[]) => {
      if (Array.isArray(task)) {
        // @TODO this represents a transaction - need to implment transaction handling in Persistence
        return Series.map(task, async (subTask) => {
          return this.executeTask(subTask);
        });
      } else {
        return this.executeTask(task);
      }
    });
  }

  async executeTask(task: EventTask): Promise<any> {
    const { name, op, params } = task;
    if (!params) return;
    const { type, matcher, values, selector } = params;
    switch (op) {
      case 'create':
        return this.persistence.create({ type, values });
      case 'findOne':
        return this.persistence.findOne({ type, matcher, selector });
      case 'find':
        return this.persistence.find({ type, matcher });
      case 'update':
        return this.persistence.update({ type, matcher, values });
      case 'upsert':
        return this.persistence.upsert({ type, matcher, values });
      case 'replace':
        return this.persistence.replace({ type, matcher, values });
      case 'delete':
        return this.persistence.delete({ type, matcher });
      case 'count':
        return this.persistence.count({ type, matcher });
      case 'run':
        return this.persistence.run(values);
      default:
        throw new Error(`Unsupported task operation: ${task.op}`);
    }
  }
}