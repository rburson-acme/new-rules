/**
 * Terraform command-related type definitions
 */

import type { ShellOptions } from '../../shared/shell.js';

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
  /** Upgrade provider plugins to the latest version */
  upgrade?: boolean;
  /** Reconfigure backend even if already initialized */
  reconfigure?: boolean;
}

/**
 * Options for terraform plan command
 */
export interface TerraformPlanOptions extends ShellOptions {
  /** Generate a destroy plan */
  destroy?: boolean;
  /** Enable or disable state refresh before planning */
  refresh?: boolean;
}

/**
 * Options for terraform apply command
 */
export interface TerraformApplyOptions extends ShellOptions {
  /** Enable or disable state refresh before applying */
  refresh?: boolean;
}
