/**
 * Executor interface for dependency injection
 */

import type { ShellOptions } from '../../shared/shell.js';
import type { TerraformCommandResult } from './command.types.js';

/**
 * Interface for executing Terraform commands
 *
 * Allows for dependency injection and testing by abstracting
 * the actual command execution mechanism.
 */
export interface ITerraformExecutor {
  /**
   * Execute a Terraform command asynchronously
   */
  executeCommand(
    command: string,
    args: string[],
    options: ShellOptions
  ): Promise<TerraformCommandResult>;

  /**
   * Execute a Terraform command synchronously
   */
  executeCommandSync(
    command: string,
    args: string[],
    options: ShellOptions
  ): TerraformCommandResult;
}
