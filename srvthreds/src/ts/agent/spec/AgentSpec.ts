import { TaskSpec } from '../../thredlib/task/spec/TaskSpec.js';

export interface AgentSpec {
  name: string;
  nodeType: string;
  taskSpecs: TaskSpec[];
}
