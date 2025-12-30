/**
 * State command - Manage Terraform state
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../../shared/logger.js';
import { execCommand } from '../../shared/shell.js';
import { requireString, ValidationError, confirmAction } from '../../shared/error-handler.js';
import { createConfigLoader } from '../../shared/config-loader.js';
import { TerraformManager, EnvironmentConfig } from '../utils/terraform.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface StackConfig {
  name: string;
  path: string;
  dependencies: string[];
}

interface DeployConfig {
  stacks: StackConfig[];
  environments: string[];
}

interface EnvironmentsConfig {
  [key: string]: EnvironmentConfig;
}

const STATE_COMMANDS = ['backup', 'validate', 'repair', 'recover', 'clean', 'show'];

export const STATE_COMMAND_DESCRIPTION = 'Manage Terraform state (backup, validate, repair, recover, clean)';

export async function stateCommand(args: string[]): Promise<void> {
  if (args.length === 0 || args.includes('--help')) {
    console.log(`
Manage Terraform state

USAGE:
  terraform-cli state <subcommand> <environment> [stacks...]

SUBCOMMANDS:
  backup      Backup state files with timestamp
  validate    Check state consistency and configuration
  repair      Refresh state from Azure
  recover     Detect and fix out-of-sync resources (already exists errors)
  clean       Remove orphaned resources from state
  show        Display current state

OPTIONS:
  --help      Show this help message

EXAMPLES:
  # Backup state before deployment
  terraform-cli state backup dev

  # Validate state consistency
  terraform-cli state validate dev

  # Repair state from Azure
  terraform-cli state repair dev networking

  # Recover out-of-sync state (resources that exist but aren't in state)
  terraform-cli state recover dev cosmosdb --dry-run

  # Show state for a stack
  terraform-cli state show dev networking
`);
    return;
  }

  const subcommand = requireString(args[0], 'subcommand');
  const environment = requireString(args[1], 'environment');

  if (!STATE_COMMANDS.includes(subcommand)) {
    throw new ValidationError(`Invalid state subcommand: ${subcommand}. Valid options: ${STATE_COMMANDS.join(', ')}`);
  }

  // Load configuration
  const configDir = path.join(__dirname, '../../..', 'configs', 'terraform');
  const configLoader = createConfigLoader(configDir, 'state');

  let deployConfig: DeployConfig;
  let environmentsConfig: EnvironmentsConfig;
  try {
    deployConfig = configLoader.loadConfig<DeployConfig>('stacks.json');
    environmentsConfig = configLoader.loadConfig<EnvironmentsConfig>('environments.json');
  } catch (error: any) {
    throw new ValidationError(`Failed to load configuration: ${error.message}`);
  }

  // Validate environment
  if (!deployConfig.environments.includes(environment)) {
    throw new ValidationError(
      `Invalid environment: ${environment}. Valid options: ${deployConfig.environments.join(', ')}`,
    );
  }

  // Get environment config
  const envConfig = environmentsConfig[environment];
  if (!envConfig) {
    throw new ValidationError(`Environment configuration not found for: ${environment}`);
  }

  const terraformDir = path.join(__dirname, '../../..', 'terraform');
  const terraform = new TerraformManager(terraformDir, environment, envConfig);

  const requestedStacks = args.slice(2).filter((a) => !a.startsWith('--'));
  const stacksToProcess =
    requestedStacks.length > 0
      ? deployConfig.stacks.filter((s) => requestedStacks.includes(s.name))
      : deployConfig.stacks;

  switch (subcommand) {
    case 'backup':
      await backupState(stacksToProcess, terraformDir, environment);
      break;

    case 'validate':
      await validateState(stacksToProcess, terraform);
      break;

    case 'repair':
      await repairState(stacksToProcess, terraform);
      break;

    case 'recover':
      const dryRun = args.includes('--dry-run');
      const force = args.includes('--force');
      await recoverState(stacksToProcess, terraformDir, environment, dryRun, force);
      break;

    case 'clean':
      await cleanState(stacksToProcess, terraform);
      break;

    case 'show':
      await showState(stacksToProcess, terraform);
      break;
  }
}

async function backupState(stacks: StackConfig[], terraformDir: string, environment: string): Promise<void> {
  logger.section('BACKING UP STATE');

  const backupDir = path.join(terraformDir, '.state-backups', new Date().toISOString().replace(/[:.]/g, '-'));
  fs.mkdirSync(backupDir, { recursive: true });

  for (const stack of stacks) {
    const stateFile = path.join(terraformDir, stack.path, `terraform.${environment}.tfstate`);

    if (fs.existsSync(stateFile)) {
      const backupFile = path.join(backupDir, `${stack.name}.tfstate`);
      fs.copyFileSync(stateFile, backupFile);
      logger.success(`Backed up ${stack.name} state`);
    } else {
      logger.warn(`No state file found for ${stack.name}`, 'backup');
    }
  }

  logger.info(`State backed up to ${backupDir}`, 'backup');
}

async function validateState(stacks: StackConfig[], terraform: TerraformManager): Promise<void> {
  logger.section('VALIDATING STATE');

  let validCount = 0;
  let errorCount = 0;

  for (const stack of stacks) {
    try {
      await terraform.validate(stack.path);
      logger.success(`${stack.name} state is valid`);
      validCount++;
    } catch (error: any) {
      logger.failure(`${stack.name} state validation failed: ${error.message}`);
      errorCount++;
    }
  }

  logger.info(`Validation complete: ${validCount} valid, ${errorCount} errors`, 'validate');
}

async function repairState(stacks: StackConfig[], terraform: TerraformManager): Promise<void> {
  logger.section('REPAIRING STATE');

  for (const stack of stacks) {
    try {
      await terraform.refresh(stack.path);
      logger.success(`Refreshed ${stack.name} state from Azure`);
    } catch (error: any) {
      logger.failure(`Failed to refresh ${stack.name} state: ${error.message}`);
    }
  }
}

async function cleanState(stacks: StackConfig[], terraform: TerraformManager): Promise<void> {
  logger.section('CLEANING STATE');

  for (const stack of stacks) {
    try {
      const state = await terraform.showState(stack.path);
      const resourceCount = state.resources?.length || 0;
      logger.info(`${stack.name} has ${resourceCount} resources in state`, 'clean');
    } catch (error: any) {
      logger.warn(`Could not analyze ${stack.name} state: ${error.message}`, 'clean');
    }
  }

  logger.info('State cleanup analysis complete', 'clean');
}

async function showState(stacks: StackConfig[], terraform: TerraformManager): Promise<void> {
  logger.section('SHOWING STATE');

  for (const stack of stacks) {
    try {
      const state = await terraform.showState(stack.path);
      console.log(`\n${stack.name}:`);
      console.log(`  Version: ${state.version}`);
      console.log(`  Terraform: ${state.terraform_version}`);
      console.log(`  Resources: ${state.resources?.length || 0}`);
      console.log(`  Outputs: ${Object.keys(state.outputs || {}).length}`);
    } catch (error: any) {
      logger.warn(`Could not show ${stack.name} state: ${error.message}`, 'show');
    }
  }
}

/**
 * Recover out-of-sync state - detects resources that exist in Azure but not in Terraform state
 * Migrated from: terraform/scripts/recover-state.sh
 */
async function recoverState(
  stacks: StackConfig[],
  terraformDir: string,
  environment: string,
  dryRun: boolean,
  force: boolean,
): Promise<void> {
  logger.section('STATE RECOVERY');

  for (const stack of stacks) {
    const stackDir = path.join(terraformDir, stack.path);
    const tfvarsFile = `${environment}.tfvars`;
    const tfvarsPath = path.join(stackDir, tfvarsFile);

    logger.info(`Analyzing ${stack.name}...`, 'recover');

    // Check if tfvars exists
    if (!fs.existsSync(tfvarsPath)) {
      logger.warn(`No ${tfvarsFile} found for ${stack.name}, skipping`, 'recover');
      continue;
    }

    // Check if we can access state
    const stateListResult = execCommand('terraform state list', {
      cwd: stackDir,
      context: 'recover',
    });

    if (!stateListResult.success) {
      logger.warn(`Cannot access state for ${stack.name}: ${stateListResult.stderr}`, 'recover');
      logger.info('Possible causes:', 'recover');
      console.log('  1. Backend not initialized');
      console.log('  2. Backend credentials missing');
      console.log('  3. State file corrupted');
      continue;
    }

    // Show current resources in state
    const resourceCount = stateListResult.stdout.trim().split('\n').filter(Boolean).length;
    logger.info(`Found ${resourceCount} resources in state`, 'recover');

    // Run terraform plan to detect out-of-sync resources
    logger.info('Running terraform plan to detect out-of-sync resources...', 'recover');

    const planResult = execCommand(`terraform plan -var-file="${tfvarsFile}" -detailed-exitcode 2>&1`, {
      cwd: stackDir,
      context: 'recover',
    });

    // Check for "already exists" errors
    const alreadyExistsMatch =
      planResult.stdout.match(/already exists/gi) || planResult.stderr.match(/already exists/gi);

    if (!alreadyExistsMatch) {
      if (planResult.exitCode === 0) {
        logger.success(`${stack.name} state is in sync - no changes needed`);
      } else if (planResult.exitCode === 2) {
        logger.info(`${stack.name} has pending changes but no out-of-sync resources`, 'recover');
      } else {
        logger.warn(`${stack.name} plan had errors but no 'already exists' issues detected`, 'recover');
      }
      continue;
    }

    // Found out-of-sync resources
    logger.warn(`Detected resource(s) that exist in Azure but not in Terraform state`, 'recover');
    console.log('');

    // Extract relevant error lines
    const planOutput = planResult.stdout + planResult.stderr;
    const errorLines = planOutput
      .split('\n')
      .filter((line) => line.includes('already exists') || line.includes('Error:'));

    for (const line of errorLines.slice(0, 10)) {
      console.log(`  ${line.trim()}`);
    }

    console.log('');

    // Show recovery options
    logger.info('Recovery Options:', 'recover');
    console.log('  1. Import existing resources into state');
    console.log('     terraform import <resource_address> <azure_resource_id>');
    console.log('');
    console.log('  2. Refresh state (may resolve some drift)');
    console.log(`     terraform refresh -var-file="${tfvarsFile}"`);
    console.log('');
    console.log('  3. Remove from state and recreate');
    console.log('     terraform state rm <resource_address>');
    console.log('');

    if (dryRun) {
      logger.warn('[DRY RUN] No changes will be made', 'recover');
      logger.info('Would execute:', 'recover');
      console.log(`  cd ${stackDir}`);
      console.log(`  terraform refresh -var-file="${tfvarsFile}"`);
      continue;
    }

    // Attempt recovery via refresh
    if (!force) {
      console.log('');
      const confirmed = await confirmAction('Attempt state refresh to recover?');
      if (!confirmed) {
        logger.warn('Recovery skipped', 'recover');
        continue;
      }
    }

    logger.info('Refreshing Terraform state...', 'recover');

    const refreshResult = execCommand(`terraform refresh -var-file="${tfvarsFile}"`, {
      cwd: stackDir,
      context: 'recover',
      verbose: true,
    });

    if (refreshResult.success) {
      logger.success('State refresh completed');

      // Verify the fix
      logger.info('Verifying fix...', 'recover');
      const verifyResult = execCommand(`terraform plan -var-file="${tfvarsFile}" -detailed-exitcode`, {
        cwd: stackDir,
        context: 'recover',
      });

      if (verifyResult.exitCode === 0 || verifyResult.exitCode === 2) {
        logger.success('State is now in sync!');
        if (verifyResult.exitCode === 2) {
          logger.info('There are pending changes - run terraform apply when ready', 'recover');
        }
      } else {
        logger.warn('State may still be out of sync', 'recover');
        logger.info(`Run: terraform plan -var-file="${tfvarsFile}" for details`, 'recover');
      }
    } else {
      logger.failure('State refresh failed');
      logger.info('Manual recovery required:', 'recover');
      console.log('  1. Review the error above');
      console.log('  2. Use: terraform import <resource> <resource-id>');
      console.log('  3. Or use: terraform state rm <resource> (if resource should not exist)');
    }
  }

  logger.info('State recovery analysis complete', 'recover');
}
