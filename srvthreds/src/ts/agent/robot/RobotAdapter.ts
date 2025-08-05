import { errorCodes, errorKeys, Event, EventTask, EventThrowable, EventValues, Series, Tasks } from '../../thredlib';
import { Adapter } from '../adapter/Adapter';

export class RobotAdapter implements Adapter {
  constructor(private config?: { hostString?: string; dbname?: string }) {}

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
    return Series.map(content.tasks, async (task: EventTask | EventTask[]) => {
      // if the task is an array, it represents a transaction
      if (Array.isArray(task) && task.length) {
        throw EventThrowable.get({
          message: 'Task transactions are not currently supported by the RobotAdapter',
          code: errorCodes[errorKeys.ARGUMENT_VALIDATION_ERROR].code,
        });
      } else {
        // single task, execute it directly
        if (Tasks.getTaskName(task as EventTask) === 'deploy_robot') {
          // simulate robot deployment
          return {
            robotId: 'robot_id_0',
            videoStreamUrl: 'http://robot0.local/stream',
            latitude: 30.089052,
            longitude: -81.725556,
          };
        }
      }
    });
  }
}
