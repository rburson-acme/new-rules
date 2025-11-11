/**
 * Terraform-specific utilities
 */

import * as path from 'path';
import { logger } from '../../shared/logger.js';
import { execCommand, execCommandAsync, ShellOptions } from '../../shared/shell.js';
import { TerraformError } from '../../shared/error-handler.js';

export interface TerraformStackConfig {
  name: string;
  path: string;
  dependencies: string[];
}

export interface TerraformState {
  version: number;
  terraform_version: string;
  serial: number;
  lineage: string;
  outputs: Record<string, any>;
  resources: Array<{ type: string; name: string }>;
}

export interface EnvironmentConfig {
  bootstrapResourceGroup: string;
  bootstrapStorageAccount: string;
}

export class TerraformManager {
  private terraformDir: string;
  private environment: string;
  private envConfig?: EnvironmentConfig;

  constructor(terraformDir: string, environment: string, envConfig?: EnvironmentConfig) {
    this.terraformDir = terraformDir;
    this.environment = environment;
    this.envConfig = envConfig;
  }

  /**
   * Initialize Terraform in a directory
   */
  async init(stackPath: string, options: ShellOptions = {}): Promise<void> {
    const fullPath = path.join(this.terraformDir, stackPath);
    logger.info(`Initializing Terraform in ${stackPath}`, 'terraform');

    // Extract stack name from path (e.g., "stacks/networking" -> "networking")
    const stackName = stackPath.split('/').pop() || 'unknown';

    logger.info(`Stack name: ${stackName}`, 'terraform');

    // Build backend config arguments
    const backendConfigArgs = [
      `-backend-config=key=stacks/${stackName}/${this.environment}.tfstate`,
    ];

    // Add storage account config if available
    if (this.envConfig) {
      backendConfigArgs.push(
        `-backend-config=resource_group_name=${this.envConfig.bootstrapResourceGroup}`,
        `-backend-config=storage_account_name=${this.envConfig.bootstrapStorageAccount}`,
        `-backend-config=container_name=tfstate`
      );
    }

    logger.info(`Backend config args: ${backendConfigArgs.join(' ')}`, 'terraform');
    const result = await execCommandAsync('terraform', ['init', ...backendConfigArgs], {
      ...options,
      cwd: fullPath,
      context: 'terraform-init',
    });

    if (!result.success) {
      throw new TerraformError(`Failed to initialize Terraform in ${stackPath}`);
    }
  }

  /**
   * Validate Terraform configuration
   */
  async validate(stackPath: string, options: ShellOptions = {}): Promise<void> {
    const fullPath = path.join(this.terraformDir, stackPath);
    logger.info(`Validating Terraform in ${stackPath}`, 'terraform');

    const result = await execCommandAsync('terraform', ['validate'], {
      ...options,
      cwd: fullPath,
      context: 'terraform-validate',
    });

    if (!result.success) {
      throw new TerraformError(`Terraform validation failed in ${stackPath}`);
    }
  }

  /**
   * Plan Terraform changes
   */
  async plan(
    stackPath: string,
    planFile: string,
    options: ShellOptions = {}
  ): Promise<string> {
    const fullPath = path.join(this.terraformDir, stackPath);
    logger.info(`Planning Terraform changes in ${stackPath}`, 'terraform');

    const args = [
      'plan',
      `-var-file=${this.environment}.tfvars`,
      `-out=${planFile}`,
    ];

    const result = await execCommandAsync('terraform', args, {
      ...options,
      cwd: fullPath,
      context: 'terraform-plan',
    });

    if (!result.success) {
      throw new TerraformError(`Terraform plan failed in ${stackPath}`);
    }

    return planFile;
  }

  /**
   * Apply Terraform changes
   */
  async apply(stackPath: string, planFile?: string, options: ShellOptions = {}): Promise<void> {
    const fullPath = path.join(this.terraformDir, stackPath);
    logger.info(`Applying Terraform changes in ${stackPath}`, 'terraform');

    const args = ['apply', '-auto-approve'];
    if (planFile) {
      args.push(planFile);
    }

    const result = await execCommandAsync('terraform', args, {
      ...options,
      cwd: fullPath,
      context: 'terraform-apply',
    });

    if (!result.success) {
      throw new TerraformError(`Terraform apply failed in ${stackPath}`);
    }
  }

  /**
   * Destroy Terraform resources
   */
  async destroy(stackPath: string, options: ShellOptions = {}): Promise<void> {
    const fullPath = path.join(this.terraformDir, stackPath);
    logger.info(`Destroying Terraform resources in ${stackPath}`, 'terraform');

    const args = [
      'destroy',
      `-var-file=${this.environment}.tfvars`,
      '-auto-approve',
    ];

    const result = await execCommandAsync('terraform', args, {
      ...options,
      cwd: fullPath,
      context: 'terraform-destroy',
    });

    if (!result.success) {
      throw new TerraformError(`Terraform destroy failed in ${stackPath}`);
    }
  }

  /**
   * Get Terraform output
   */
  async getOutput(stackPath: string, outputName?: string): Promise<any> {
    const fullPath = path.join(this.terraformDir, stackPath);

    const args = ['output', '-json'];
    if (outputName) {
      args.push(outputName);
    }

    const result = execCommand(`terraform ${args.join(' ')}`, {
      cwd: fullPath,
      context: 'terraform-output',
    });

    if (!result.success) {
      throw new TerraformError(`Failed to get Terraform output from ${stackPath}`);
    }

    try {
      return JSON.parse(result.stdout);
    } catch {
      return result.stdout;
    }
  }

  /**
   * Refresh Terraform state
   */
  async refresh(stackPath: string, options: ShellOptions = {}): Promise<void> {
    const fullPath = path.join(this.terraformDir, stackPath);
    logger.info(`Refreshing Terraform state in ${stackPath}`, 'terraform');

    const args = ['refresh', `-var-file=${this.environment}.tfvars`];

    const result = await execCommandAsync('terraform', args, {
      ...options,
      cwd: fullPath,
      context: 'terraform-refresh',
    });

    if (!result.success) {
      throw new TerraformError(`Terraform refresh failed in ${stackPath}`);
    }
  }

  /**
   * Force unlock Terraform state
   */
  async forceUnlock(stackPath: string, lockId: string, options: ShellOptions = {}): Promise<void> {
    const fullPath = path.join(this.terraformDir, stackPath);
    logger.info(`Force unlocking Terraform state in ${stackPath}`, 'terraform');

    const result = await execCommandAsync('terraform', ['force-unlock', '-force', lockId], {
      ...options,
      cwd: fullPath,
      context: 'terraform-force-unlock',
    });

    if (!result.success) {
      throw new TerraformError(`Failed to force unlock Terraform state in ${stackPath}`);
    }
  }

  /**
   * Show Terraform state
   */
  async showState(stackPath: string): Promise<TerraformState> {
    const fullPath = path.join(this.terraformDir, stackPath);

    const result = execCommand('terraform show -json', {
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
        const collectResources = (module: any): any[] => {
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
          resources: allResources.map((r: any) => ({ type: r.type, name: r.name }))
        };
      }

      return JSON.parse(result.stdout);
    } catch (error: any) {
      throw new TerraformError(`Failed to parse Terraform state in ${stackPath}: ${error.message}`);
    }
  }
}

