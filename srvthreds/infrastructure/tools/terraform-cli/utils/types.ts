/**
 * Type definitions for Terraform CLI
 *
 * Organized by concern for better compile performance and maintainability
 */

import { ShellOptions } from '../../shared/shell.js';

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Stack configuration defining infrastructure component
 */
export interface TerraformStackConfig {
  name: string;
  path: string;
  dependencies: string[];
}

/**
 * Environment-specific configuration
 */
export interface EnvironmentConfig {
  stateBackendResourceGroup: string;
  stateBackendStorageAccount: string;
}

// ============================================================================
// State Types
// ============================================================================

/**
 * Terraform state structure
 */
export interface TerraformState {
  version: number;
  terraform_version: string;
  serial: number;
  lineage: string;
  outputs: Record<string, TerraformOutput>;
  resources: Array<TerraformResource>;
}

/**
 * Resource representation in Terraform state
 */
export interface TerraformResource {
  type: string;
  name: string;
  provider?: string;
  module?: string;
}

/**
 * Output value from Terraform
 */
export interface TerraformOutput {
  value: any;
  type?: string;
  sensitive?: boolean;
}

// ============================================================================
// Command Types
// ============================================================================

/**
 * Result from executing a Terraform command
 */
export interface TerraformCommandResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Options for terraform init command
 */
export interface TerraformInitOptions extends ShellOptions {
  upgrade?: boolean;
  reconfigure?: boolean;
}

/**
 * Options for terraform plan command
 */
export interface TerraformPlanOptions extends ShellOptions {
  destroy?: boolean;
  refresh?: boolean;
}

/**
 * Options for terraform apply command
 */
export interface TerraformApplyOptions extends ShellOptions {
  refresh?: boolean;
}

// ============================================================================
// Executor Interface
// ============================================================================

/**
 * Interface for executing Terraform commands
 * Allows for dependency injection and testing
 */
export interface ITerraformExecutor {
  executeCommand(command: string, args: string[], options: ShellOptions): Promise<TerraformCommandResult>;
  executeCommandSync(command: string, args: string[], options: ShellOptions): TerraformCommandResult;
}
