import { MessageHandlerParams } from '../AgentService.js';
import { RobotAdapter } from './RobotAdapter.js';
import BaseAgent from '../base/BaseAgent.js';

export interface RobotAgentConfig {}
export interface RobotAgentArgs {}

export class RobotAgent extends BaseAgent {
  constructor({ config, eventPublisher, additionalArgs }: MessageHandlerParams) {
    super({
      config,
      eventPublisher,
      additionalArgs,
      adapter: new RobotAdapter({}),
    });
  }

  /**
   * Perform any cleanup or shutdown tasks for the agent.
   * @returns {Promise<void>}
   */
  shutdown(): Promise<void> {
    return Promise.resolve();
  }
}

export default RobotAgent;
