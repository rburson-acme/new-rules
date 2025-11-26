/**
 * Terraform-specific utilities
 *
 * Provides TerraformManager class for high-level Terraform operations
 */

import * as path from 'path';
import { logger } from '../../shared/logger.js';
import { execCommand, execCommandAsync, ShellOptions } from '../../shared/shell.js';
import { TerraformError } from '../../shared/error-handler.js';

// Import types from centralized location
import type {
  EnvironmentConfig,
  TerraformState,
  TerraformResource,
  TerraformOutput,
  TerraformCommandResult,
  TerraformInitOptions,
  TerraformPlanOptions,
  TerraformApplyOptions,
  ITerraformExecutor
} from '../types/index.js';

// import { BACKEND_CONFIG } from '../types/constants.js';

// Re-export all types for backward compatibility
export type {
  TerraformStackConfig,
  EnvironmentConfig,
  TerraformState,
  TerraformResource,
  TerraformOutput,
  TerraformCommandResult,
  TerraformInitOptions,
  TerraformPlanOptions,
  TerraformApplyOptions,
  ITerraformExecutor
} from '../types/index.js';

// ============================================================================
// Executor Implementation
// ============================================================================

/**
 * Default Terraform executor using shell commands
 */
export class DefaultTerraformExecutor implements ITerraformExecutor {
  async executeCommand(command: string, args: string[], options: ShellOptions): Promise<TerraformCommandResult> {
    const result = await execCommandAsync(command, args, options);
    return {
      success: result.success,
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode || (result.success ? 0 : 1)
    };
  }

  executeCommandSync(command: string, args: string[], options: ShellOptions): TerraformCommandResult {
    const result = execCommand(`${command} ${args.join(' ')}`, options);
    return {
      success: result.success,
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode || (result.success ? 0 : 1)
    };
  }
}

// ============================================================================
// Terraform Manager
// ============================================================================

/**
 * High-level abstraction for Terraform operations
 *
 * Provides type-safe methods for all common Terraform commands with:
 * - Automatic backend configuration
 * - Environment-specific variable files
 * - Dependency injection support for testing
 * - Comprehensive error handling
 */
export class TerraformManager {
  private terraformDir: string;
  private environment: string;
  private envConfig?: EnvironmentConfig;
  private executor: ITerraformExecutor;

  constructor(
    terraformDir: string,
    environment: string,
    envConfig?: EnvironmentConfig,
    executor?: ITerraformExecutor
  ) {
    this.terraformDir = terraformDir;
    this.environment = environment;
    this.envConfig = envConfig;
    this.executor = executor || new DefaultTerraformExecutor();
  }

  /**
   * Get the full path to a stack directory
   */
  private getStackPath(stackPath: string): string {
    return path.join(this.terraformDir, stackPath);
  }

  /**
   * Extract stack name from path
   */
  private getStackName(stackPath: string): string {
    return stackPath.split('/').pop() || 'unknown';
  }

  /**
   * Initialize Terraform in a directory
   */
  async init(stackPath: string, options: TerraformInitOptions = {}): Promise<void> {
    const fullPath = this.getStackPath(stackPath);
    const stackName = this.getStackName(stackPath);

    logger.info(`Initializing Terraform in ${stackPath}`, 'terraform');
    logger.info(`Stack name: ${stackName}`, 'terraform');

    // Build backend config arguments
    const backendConfigArgs = [
      `-backend-config=key=stacks/${stackName}/${this.environment}.tfstate`,
    ];

    // Add storage account config if available
    if (this.envConfig) {
      backendConfigArgs.push(
        `-backend-config=resource_group_name=${this.envConfig.stateBackendResourceGroup}`,
        `-backend-config=storage_account_name=${this.envConfig.stateBackendStorageAccount}`,
        `-backend-config=container_name=tfstate`
      );
    }

    const args = ['init', ...backendConfigArgs];
    if (options.upgrade) args.push('-upgrade');
    if (options.reconfigure) args.push('-reconfigure');

    logger.debug(`Backend config args: ${backendConfigArgs.join(' ')}`, 'terraform');

    const result = await this.executor.executeCommand('terraform', args, {
      ...options,
      cwd: fullPath,
      context: 'terraform-init',
    });

    if (!result.success) {
      throw new TerraformError(`Failed to initialize Terraform in ${stackPath}:\r\n${result.stderr}`);
    }
    logger.debug(`Terraform init successful:\r\n${result.stdout}`, 'terraform');
  }

  /**
   * Validate Terraform configuration
   */
  async validate(stackPath: string, options: ShellOptions = {}): Promise<void> {
    const fullPath = this.getStackPath(stackPath);
    logger.info(`Validating Terraform in ${stackPath}`, 'terraform');

    const result = await this.executor.executeCommand('terraform', ['validate'], {
      ...options,
      cwd: fullPath,
      context: 'terraform-validate',
    });

    if (!result.success) {
      throw new TerraformError(`Terraform validation failed in ${stackPath}:\r\n${result.stderr}`);
    }
    logger.info(`Terraform configuration is valid:\r\n${result.stdout}`, 'terraform');
  }

  /**
   * Plan Terraform changes
   */
  async plan(
    stackPath: string,
    planFile: string,
    options: TerraformPlanOptions = {}
  ): Promise<string> {
    const fullPath = this.getStackPath(stackPath);
    logger.info(`Planning Terraform changes in ${stackPath}`, 'terraform');

    const args = [
      'plan',
      `-var-file=${this.environment}.tfvars`,
      `-out=${planFile}`,
    ];

    if (options.destroy) args.push('-destroy');
    if (options.refresh === false) args.push('-refresh=false');

    const result = await this.executor.executeCommand('terraform', args, {
      ...options,
      cwd: fullPath,
      context: 'terraform-plan',
    });

    if (!result.success) {
      throw new TerraformError(`Terraform plan failed in ${stackPath}:\r\n${result.stderr}`);
    }

    logger.info(`Terraform plan:\r\n${result.stdout}`, 'terraform');
    return planFile;
  }

  /**
   * Apply Terraform changes
   */
  async apply(stackPath: string, planFile?: string, options: TerraformApplyOptions = {}): Promise<void> {
    const fullPath = this.getStackPath(stackPath);
    logger.info(`Applying Terraform changes in ${stackPath}`, 'terraform');

    const args = ['apply', '-auto-approve'];
    if (planFile) {
      args.push(planFile);
    }
    if (options.refresh === false) args.push('-refresh=false');

    const result = await this.executor.executeCommand('terraform', args, {
      ...options,
      cwd: fullPath,
      context: 'terraform-apply',
    });

    if (!result.success) {
      throw new TerraformError(`Terraform apply failed in ${stackPath}:\r\n${result.stderr}`);
    }
    logger.info(`Terraform apply:\r\n${result.stdout}`, 'terraform');
  }

  /**
   * Destroy Terraform resources
   */
  async destroy(stackPath: string, options: ShellOptions = {}): Promise<void> {
    const fullPath = this.getStackPath(stackPath);
    logger.info(`Destroying Terraform resources in ${stackPath}`, 'terraform');

    const args = [
      'destroy',
      `-var-file=${this.environment}.tfvars`,
      '-auto-approve',
    ];

    const result = await this.executor.executeCommand('terraform', args, {
      ...options,
      cwd: fullPath,
      context: 'terraform-destroy',
    });

    if (!result.success) {
      throw new TerraformError(`Terraform destroy failed in ${stackPath}:\r\n${result.stderr}`);
    }
    logger.info(`Terraform destroy:\r\n${result.stdout}`, 'terraform');
  }

  /**
   * Get Terraform output
   */
  async getOutput(stackPath: string, outputName?: string): Promise<Record<string, TerraformOutput> | TerraformOutput> {
    const fullPath = this.getStackPath(stackPath);

    const args = ['output', '-json'];
    if (outputName) {
      args.push(outputName);
    }

    const result = this.executor.executeCommandSync('terraform', args, {
      cwd: fullPath,
      context: 'terraform-output',
    });

    if (!result.success) {
      throw new TerraformError(`Failed to get Terraform output from ${stackPath}:\r\n${result.stderr}`);
    }

    logger.debug(`Terraform output:\r\n${result.stdout}`, 'terraform');
    try {
      return JSON.parse(result.stdout);
    } catch {
      return { value: result.stdout };
    }
  }

  /**
   * Refresh Terraform state
   */
  async refresh(stackPath: string, options: ShellOptions = {}): Promise<void> {
    const fullPath = this.getStackPath(stackPath);
    logger.info(`Refreshing Terraform state in ${stackPath}`, 'terraform');

    const args = ['refresh', `-var-file=${this.environment}.tfvars`];

    const result = await this.executor.executeCommand('terraform', args, {
      ...options,
      cwd: fullPath,
      context: 'terraform-refresh',
    });

    if (!result.success) {
      throw new TerraformError(`Terraform refresh failed in ${stackPath}:\r\n${result.stderr}`);
    }
    logger.info(`Terraform refresh:\r\n${result.stdout}`, 'terraform');
  }

  /**
   * Force unlock Terraform state
   */
  async forceUnlock(stackPath: string, lockId: string, options: ShellOptions = {}): Promise<void> {
    const fullPath = this.getStackPath(stackPath);
    logger.info(`Force unlocking Terraform state in ${stackPath}`, 'terraform');

    const result = await this.executor.executeCommand('terraform', ['force-unlock', '-force', lockId], {
      ...options,
      cwd: fullPath,
      context: 'terraform-force-unlock',
    });

    if (!result.success) {
      throw new TerraformError(`Failed to force unlock Terraform state in ${stackPath}:\r\n${result.stderr}`);
    }
    logger.debug(`Terraform forceUnlock:\r\n${result.stdout}`, 'terraform');
  }

  /**
   * Show Terraform state
   */
  async showState(stackPath: string): Promise<TerraformState> {
    const fullPath = this.getStackPath(stackPath);

    const result = this.executor.executeCommandSync('terraform', ['show', '-json'], {
      cwd: fullPath,
      context: 'terraform-show',
    });

    if (!result.success) {
      throw new TerraformError(`Failed to show Terraform state in ${stackPath}`);
    }

    try {
      const showOutput = JSON.parse(result.stdout);

      // terraform show -json has a different structure than raw state
      // Convert to match the TerraformState interface
      if (showOutput.values) {
        const outputs = showOutput.values.outputs || {};

        // Helper function to recursively collect resources from modules
        const collectResources = (module: any): TerraformResource[] => {
          const resources = module.resources || [];
          const childResources = (module.child_modules || []).flatMap(collectResources);
          return [...resources, ...childResources];
        };

        const allResources = collectResources(showOutput.values.root_module || {});

        return {
          version: showOutput.format_version || 0,
          terraform_version: showOutput.terraform_version,
          serial: 0, // Not available in terraform show output
          lineage: '', // Not available in terraform show output
          outputs: outputs,
          resources: allResources.map((r: any) => ({
            type: r.type,
            name: r.name,
            provider: r.provider_name,
            module: r.module_address
          }))
        };
      }

      return JSON.parse(result.stdout);
    } catch (error: any) {
      throw new TerraformError(`Failed to parse Terraform state in ${stackPath}: ${error.message}`);
    }
  }

  /**
   * Import existing infrastructure into Terraform state
   */
  async import(
    stackPath: string,
    address: string,
    id: string,
    options: ShellOptions = {}
  ): Promise<void> {
    const fullPath = this.getStackPath(stackPath);
    logger.info(`Importing resource ${address} with ID ${id} in ${stackPath}`, 'terraform');

    const args = [
      'import',
      `-var-file=${this.environment}.tfvars`,
      address,
      id
    ];

    const result = await this.executor.executeCommand('terraform', args, {
      ...options,
      cwd: fullPath,
      context: 'terraform-import',
    });

    if (!result.success) {
      throw new TerraformError(`Failed to import resource ${address} in ${stackPath}`);
    }

    logger.success(`Imported ${address} successfully`);
  }

  /**
   * Taint a resource to force recreation on next apply
   */
  async taint(stackPath: string, address: string, options: ShellOptions = {}): Promise<void> {
    const fullPath = this.getStackPath(stackPath);
    logger.info(`Tainting resource ${address} in ${stackPath}`, 'terraform');

    const result = await this.executor.executeCommand('terraform', ['taint', address], {
      ...options,
      cwd: fullPath,
      context: 'terraform-taint',
    });

    if (!result.success) {
      throw new TerraformError(`Failed to taint resource ${address} in ${stackPath}`);
    }

    logger.success(`Tainted ${address} successfully`);
  }

  /**
   * Untaint a resource
   */
  async untaint(stackPath: string, address: string, options: ShellOptions = {}): Promise<void> {
    const fullPath = this.getStackPath(stackPath);
    logger.info(`Untainting resource ${address} in ${stackPath}`, 'terraform');

    const result = await this.executor.executeCommand('terraform', ['untaint', address], {
      ...options,
      cwd: fullPath,
      context: 'terraform-untaint',
    });

    if (!result.success) {
      throw new TerraformError(`Failed to untaint resource ${address} in ${stackPath}`);
    }

    logger.success(`Untainted ${address} successfully`);
  }
}

